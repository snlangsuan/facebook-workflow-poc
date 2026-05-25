import { dbService } from '#/common/libs/db.lib'
import { logger } from '#/common/libs/logger.lib'
import { interactionRepository } from '#/features/interactions/v1/interaction.repository'

import type { IConversation, IComment, IPost } from '#/common/libs/db.lib'
import type {
  TCustomerPostPayload,
  TCustomerMessagePayload,
  TCustomerCommentPayload,
  TMessageReplyPayload,
  TCommentReplyPayload,
} from '#/features/interactions/v1/interaction.type'

type TSseListener = (data: string) => void
const sseListeners: TSseListener[] = []

export const sseBroker = {
  subscribe(listener: TSseListener): () => void {
    sseListeners.push(listener)
    return () => {
      const idx = sseListeners.indexOf(listener)
      if (idx !== -1) {
        sseListeners.splice(idx, 1)
      }
    }
  },

  broadcast(event: string, data: object): void {
    const payload = JSON.stringify({ event, data })
    for (const listener of sseListeners) {
      listener(payload)
    }
  },
}

export const interactionService = {
  async listConversations(): Promise<IConversation[]> {
    return interactionRepository.listConversations()
  },

  async getConversation(id: string): Promise<IConversation | null> {
    return interactionRepository.getConversation(id)
  },

  async receiveCustomerMessage(payload: TCustomerMessagePayload): Promise<IConversation> {
    const conv = await interactionRepository.addMessage(
      payload.senderId,
      payload.senderName,
      payload.senderId,
      payload.senderName,
      payload.text,
    )
    sseBroker.broadcast('conversation_updated', conv)
    return conv
  },

  async replyToMessage(payload: TMessageReplyPayload): Promise<IConversation | null> {
    const conv = await interactionRepository.getConversation(payload.conversationId)
    if (!conv) {
      return null
    }

    const conns = await dbService.getConnections()
    const conn = conns[0]
    if (conn && conn.accessToken) {
      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${conn.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: payload.conversationId },
            message: { text: payload.text },
          }),
        })
        if (!res.ok) {
          const err = (await res.json()) as unknown as Record<string, unknown>
          logger.error(err, 'Failed to post Messenger reply')
        }
      } catch (error) {
        logger.error(error, 'Messenger Graph API connection failure')
      }
    }

    const updated = await interactionRepository.addMessage(
      payload.conversationId,
      conv.name,
      'page',
      'Page Admin',
      payload.text,
    )
    sseBroker.broadcast('conversation_updated', updated)
    return updated
  },

  async listPosts(): Promise<IPost[]> {
    return interactionRepository.listPosts()
  },

  async getPost(id: string): Promise<IPost | null> {
    return interactionRepository.getPost(id)
  },

  async receiveCustomerPost(payload: TCustomerPostPayload): Promise<IPost> {
    const post = await interactionRepository.addPost(payload)
    sseBroker.broadcast('posts_updated', post)
    return post
  },

  async receiveCustomerComment(payload: TCustomerCommentPayload): Promise<IComment | null> {
    const comment = await interactionRepository.addComment(payload)
    if (!comment) {
      return null
    }

    const post = await interactionRepository.getPost(payload.postId)
    if (post) {
      sseBroker.broadcast('post_updated', post)
    }
    return comment
  },

  async replyToComment(payload: TCommentReplyPayload): Promise<IComment | null> {
    const conns = await dbService.getConnections()
    const conn = conns[0]
    if (conn && conn.accessToken) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${payload.postId}/comments?access_token=${conn.accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: payload.text,
            }),
          },
        )
        if (!res.ok) {
          const err = (await res.json()) as unknown as Record<string, unknown>
          logger.error(err, 'Failed to post comment reply')
        }
      } catch (error) {
        logger.error(error, 'Feed Graph API connection failure')
      }
    }

    const comment = await interactionRepository.addComment({
      postId: payload.postId,
      senderName: 'Page Admin',
      text: payload.text,
    })

    if (!comment) {
      return null
    }

    const post = await interactionRepository.getPost(payload.postId)
    if (post) {
      sseBroker.broadcast('post_updated', post)
    }
    return comment
  },
}
