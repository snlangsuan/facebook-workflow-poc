import crypto from 'node:crypto'

import { streamSSE } from 'hono/streaming'

import { rtdb } from '#/common/libs/firebase.lib'
import { logger } from '#/common/libs/logger.lib'
import { successResponseSchema } from '#/common/schemas/share.schema'
import { formatToIso } from '#/common/utils/datetime.util'
import { envVariables } from '#/factory'
import { interactionService, sseBroker } from '#/features/interactions/v1/interaction.service'

import type { JsonInputSchema, ParamInputSchema, QueryInputSchema } from '#/common/types/app.type'
import type {
  TWebhookVerifyQuery,
  TConversationParamPayload,
  TMessageReplyPayload,
  TPostParamPayload,
  TCommentReplyPayload,
  TImportPostPayload,
  TImportInboxPayload,
  THideCommentPayload,
  TLikeCommentPayload,
  TDeleteCommentPayload,
} from '#/features/interactions/v1/interaction.type'
import type { Context, Env, Input } from 'hono'

interface ISignatureResult {
  valid: boolean
  reason: string
  expectedPrefix?: string
  receivedPrefix?: string
}

/**
 * Validate the Facebook webhook payload signature (`X-Hub-Signature-256`).
 * Computes HMAC-SHA256 of the raw body with the app secret and compares in
 * constant time. Returns detail for debugging. When the app secret is not
 * configured (demo mode), validation is skipped so the POC remains runnable.
 */
function checkSignature(rawBody: string, signatureHeader?: string): ISignatureResult {
  const appSecret = envVariables.FACEBOOK_APP_SECRET
  if (!appSecret || appSecret === '<secret>') {
    return { valid: true, reason: 'skipped (app secret not configured)' }
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return { valid: false, reason: 'missing or malformed X-Hub-Signature-256 header' }
  }
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(received, 'hex')
  const detail = { expectedPrefix: expected.slice(0, 12), receivedPrefix: received.slice(0, 12) }
  if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'signature mismatch (check FACEBOOK_APP_SECRET)', ...detail }
  }
  return { valid: true, reason: 'ok', ...detail }
}

/** Summarise a webhook payload for quick log scanning. */
function summarizeWebhook(body: unknown): Record<string, unknown> {
  const b = body as { object?: string; entry?: Array<Record<string, unknown>> } | null
  if (!b?.entry) {
    return { object: b?.object, entries: 0 }
  }
  const events: string[] = []
  for (const entry of b.entry) {
    const pageId = entry.id
    for (const m of (entry.messaging as Array<{ message?: { text?: string } }>) ?? []) {
      events.push(`message("${m.message?.text ?? ''}")@${pageId}`)
    }
    for (const ch of (entry.changes as Array<{ field?: string; value?: { item?: string; verb?: string } }>) ?? []) {
      events.push(`${ch.field}:${ch.value?.item}:${ch.value?.verb}@${pageId}`)
    }
  }
  return { object: b.object, entries: b.entry.length, events }
}

export const interactionController = {
  verifyWebhook: async <E extends Env, P extends string, I extends Input & QueryInputSchema<TWebhookVerifyQuery>>(
    c: Context<E, P, I>,
  ) => {
    const query = c.req.valid('query')
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    const expectedToken = process.env.FACEBOOK_VERIFY_TOKEN || 'facebook_verify_token_123'
    const tokenMatch = token === expectedToken

    logger.info({ mode, tokenMatch, hasChallenge: !!challenge }, '🔑 [WEBHOOK] verification request (GET)')

    if (mode === 'subscribe' && tokenMatch) {
      return c.text(challenge || '')
    }
    logger.warn({ mode, receivedToken: token, expectedToken }, '❌ [WEBHOOK] verification FAILED')
    return c.text('Forbidden', 403)
  },

  receiveWebhook: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    // Read the raw body so the X-Hub-Signature-256 can be verified against the exact bytes.
    const rawBody = await c.req.text()
    const sigHeader = c.req.header('x-hub-signature-256')
    const sig = checkSignature(rawBody, sigHeader)

    let body: { object?: string; entry?: unknown[] } | null = null
    try {
      body = JSON.parse(rawBody) as { object?: string; entry?: unknown[] }
    } catch {
      // leave body null
    }

    logger.info(
      {
        signaturePresent: !!sigHeader,
        signatureValid: sig.valid,
        bodyBytes: rawBody.length,
        ...summarizeWebhook(body),
      },
      '📥 [WEBHOOK] POST received',
    )

    if (!sig.valid) {
      logger.warn(
        { reason: sig.reason, expectedPrefix: sig.expectedPrefix, receivedPrefix: sig.receivedPrefix, preview: rawBody.slice(0, 400) },
        '❌ [WEBHOOK] signature INVALID — rejecting (401)',
      )
      return c.json({ success: false, error: 'Invalid signature' }, 401)
    }

    if (!body) {
      logger.warn({ preview: rawBody.slice(0, 400) }, '❌ [WEBHOOK] invalid JSON payload (400)')
      return c.json({ success: false, error: 'Invalid JSON payload' }, 400)
    }

    if (body.object === 'page' && body.entry) {
      const queueRef = rtdb.ref('webhook_queue').push()
      await queueRef.set({
        status: 'pending',
        payload: body,
        createdAt: formatToIso(),
        error: null,
      })
      logger.info({ queueKey: queueRef.key }, '✅ [WEBHOOK] enqueued for processing')
      return c.json(successResponseSchema.parse({ success: true }))
    }

    logger.warn({ object: body.object }, '⚠️ [WEBHOOK] ignored — not a page event (400)')
    return c.json({ success: false, error: 'Unknown event payload' }, 400)
  },

  sseEventsStream: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache, no-transform')
    c.header('Connection', 'keep-alive')
    // Tell nginx (and compatible proxies) NOT to buffer this response — the usual
    // cause of 502/hangs on SSE behind a reverse proxy.
    c.header('X-Accel-Buffering', 'no')

    return streamSSE(c as unknown as Context, async (stream) => {
      // Flush a byte immediately so the proxy establishes the stream before its
      // read-timeout fires, and hint a client reconnect delay.
      await stream.writeSSE({ event: 'connected', data: 'ok', retry: 5000 })

      const unsubscribe = sseBroker.subscribe((data: string) => {
        void stream.writeSSE({
          data,
          event: 'message',
          id: String(Date.now()),
        })
      })

      // Heartbeat well under common proxy idle timeouts (often 30–60s).
      const interval = setInterval(() => {
        void stream.writeSSE({
          data: 'ping',
          event: 'heartbeat',
        })
      }, 15000)

      stream.onAbort(() => {
        clearInterval(interval)
        unsubscribe()
      })

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          resolve()
        })
      })
    })
  },

  listConversations: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const list = await interactionService.listConversations()
    return c.json(list)
  },

  getConversation: async <
    E extends Env,
    P extends string,
    I extends Input & ParamInputSchema<TConversationParamPayload>,
  >(
    c: Context<E, P, I>,
  ) => {
    const { id } = c.req.valid('param')
    const conv = await interactionService.getConversation(id)
    if (!conv) {
      return c.json({ success: false, error: 'Conversation not found' }, 404)
    }
    return c.json(conv)
  },

  importInbox: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TImportInboxPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { pageId } = c.req.valid('json')
    const result = await interactionService.importConversationsFromPage(pageId)
    return c.json(result)
  },

  syncProfile: async <
    E extends Env,
    P extends string,
    I extends Input & ParamInputSchema<TConversationParamPayload>,
  >(
    c: Context<E, P, I>,
  ) => {
    const { id } = c.req.valid('param')
    const result = await interactionService.syncConversationProfile(id)
    if (!result.conversation) {
      return c.json({ success: false, error: result.error ?? 'Conversation not found' }, 404)
    }
    return c.json({
      success: result.profileFetched,
      profileFetched: result.profileFetched,
      conversation: result.conversation,
      error: result.error,
    })
  },

  replyToMessage: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TMessageReplyPayload>>(
    c: Context<E, P, I>,
  ) => {
    const payload = c.req.valid('json')
    const conv = await interactionService.replyToMessage(payload)
    if (!conv) {
      return c.json({ success: false, error: 'Conversation not found' }, 404)
    }
    return c.json(conv)
  },

  listPosts: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const posts = await interactionService.listPosts()
    return c.json(posts)
  },

  importPost: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TImportPostPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { input, pageId } = c.req.valid('json')
    try {
      const post = await interactionService.importPost(input, pageId)
      return c.json(post)
    } catch (error) {
      const err = error as Error
      return c.json({ success: false, error: err.message || 'Import failed' }, 400)
    }
  },

  getPost: async <E extends Env, P extends string, I extends Input & ParamInputSchema<TPostParamPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { id } = c.req.valid('param')
    const post = await interactionService.getPost(id)
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    return c.json(post)
  },

  deletePost: async <E extends Env, P extends string, I extends Input & ParamInputSchema<TPostParamPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { id } = c.req.valid('param')
    await interactionService.deletePost(id)
    return c.json(successResponseSchema.parse({ success: true }))
  },

  syncPost: async <E extends Env, P extends string, I extends Input & ParamInputSchema<TPostParamPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { id } = c.req.valid('param')
    try {
      const post = await interactionService.syncPost(id)
      if (!post) {
        return c.json({ success: false, error: 'Post not found' }, 404)
      }
      return c.json(post)
    } catch (error) {
      const err = error as Error
      return c.json({ success: false, error: err.message || 'Sync failed' }, 400)
    }
  },

  hideComment: async <E extends Env, P extends string, I extends Input & JsonInputSchema<THideCommentPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { postId, commentId, hidden } = c.req.valid('json')
    try {
      const post = await interactionService.hideComment(postId, commentId, hidden)
      if (!post) {
        return c.json({ success: false, error: 'Comment not found' }, 404)
      }
      return c.json(post)
    } catch (error) {
      const err = error as Error
      return c.json({ success: false, error: err.message || 'Failed to update comment visibility' }, 400)
    }
  },

  likeComment: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TLikeCommentPayload>>(
    c: Context<E, P, I>,
  ) => {
    const payload = c.req.valid('json')
    try {
      const post = await interactionService.likeComment(payload)
      if (!post) {
        return c.json({ success: false, error: 'Comment not found' }, 404)
      }
      return c.json(post)
    } catch (error) {
      const err = error as Error
      return c.json({ success: false, error: err.message || 'Failed to update comment like' }, 400)
    }
  },

  deleteComment: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TDeleteCommentPayload>>(
    c: Context<E, P, I>,
  ) => {
    const payload = c.req.valid('json')
    try {
      const post = await interactionService.deleteComment(payload)
      if (!post) {
        return c.json({ success: false, error: 'Comment not found' }, 404)
      }
      return c.json(post)
    } catch (error) {
      const err = error as Error
      return c.json({ success: false, error: err.message || 'Failed to delete comment' }, 400)
    }
  },

  replyToComment: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TCommentReplyPayload>>(
    c: Context<E, P, I>,
  ) => {
    const payload = c.req.valid('json')
    const comment = await interactionService.replyToComment(payload)
    if (!comment) {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    return c.json(comment)
  },
}
