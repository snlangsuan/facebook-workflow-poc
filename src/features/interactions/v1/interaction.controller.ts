import { streamSSE } from 'hono/streaming'

import { rtdb } from '#/common/libs/firebase.lib'
import { successResponseSchema } from '#/common/schemas/share.schema'
import { formatToIso } from '#/common/utils/datetime.util'
import { interactionService, sseBroker } from '#/features/interactions/v1/interaction.service'

import type { JsonInputSchema, ParamInputSchema, QueryInputSchema } from '#/common/types/app.type'
import type {
  TWebhookVerifyQuery,
  TConversationParamPayload,
  TMessageReplyPayload,
  TPostParamPayload,
  TCommentReplyPayload,
} from '#/features/interactions/v1/interaction.type'
import type { Context, Env, Input } from 'hono'

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
    const body = (await c.req.json()) as {
      object?: string
      entry?: Array<{
        messaging?: Array<{
          sender?: { id: string }
          message?: { text: string }
        }>
        changes?: Array<{
          field: string
          value: {
            item: string
            verb: string
            post_id?: string
            message?: string
            from?: { name: string }
            photos?: string[]
          }
        }>
      }>
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
