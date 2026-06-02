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
} from '#/features/interactions/v1/interaction.type'
import type { Context, Env, Input } from 'hono'

/**
 * Validate the Facebook webhook payload signature (`X-Hub-Signature-256`).
 * Computes HMAC-SHA256 of the raw body with the app secret and compares in
 * constant time. When the app secret is not configured (demo mode), validation
 * is skipped so the POC remains runnable.
 */
function isValidSignature(rawBody: string, signatureHeader?: string): boolean {
  const appSecret = envVariables.FACEBOOK_APP_SECRET
  if (!appSecret || appSecret === '<secret>') {
    logger.warn('FACEBOOK_APP_SECRET not configured; skipping webhook signature validation')
    return true
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(received, 'hex')
  if (expectedBuf.length !== receivedBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuf, receivedBuf)
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

    if (mode === 'subscribe' && token === expectedToken) {
      return c.text(challenge || '')
    }
    return c.text('Forbidden', 403)
  },

  receiveWebhook: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    // Read the raw body so the X-Hub-Signature-256 can be verified against the exact bytes.
    const rawBody = await c.req.text()

    if (!isValidSignature(rawBody, c.req.header('x-hub-signature-256'))) {
      logger.warn('Rejected webhook with invalid X-Hub-Signature-256')
      return c.json({ success: false, error: 'Invalid signature' }, 401)
    }

    let body: {
      object?: string
      entry?: unknown[]
    }
    try {
      body = JSON.parse(rawBody) as { object?: string; entry?: unknown[] }
    } catch {
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
      return c.json(successResponseSchema.parse({ success: true }))
    }

    return c.json({ success: false, error: 'Unknown event payload' }, 400)
  },

  sseEventsStream: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')

    return streamSSE(c as unknown as Context, async (stream) => {
      const unsubscribe = sseBroker.subscribe((data: string) => {
        void stream.writeSSE({
          data,
          event: 'message',
          id: String(Date.now()),
        })
      })

      const interval = setInterval(() => {
        void stream.writeSSE({
          data: 'ping',
          event: 'heartbeat',
        })
      }, 25000)

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
