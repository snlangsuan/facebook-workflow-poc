import { dbService } from '#/common/libs/db.lib'

import type { IConversation, IComment, IPost } from '#/common/libs/db.lib'
import type { TCustomerPostPayload, TCustomerCommentPayload } from '#/features/interactions/v1/interaction.type'

export const interactionRepository = {
  async listConversations(): Promise<IConversation[]> {
    return await dbService.getConversations()
  },

  async getConversation(id: string): Promise<IConversation | null> {
    const conv = await dbService.getConversationById(id)
    return conv || null
  },

  async addMessage(
    convId: string,
    convName: string,
    senderId: string,
    senderName: string,
    text: string,
    opts?: { pageId?: string; status?: 'sent' | 'failed'; error?: string },
  ): Promise<IConversation> {
    return await dbService.addMessage(convId, convName, senderId, senderName, text, opts)
  },

  async listPosts(): Promise<IPost[]> {
    return await dbService.getPosts()
  },

  async getPost(id: string): Promise<IPost | null> {
    const post = await dbService.getPostById(id)
    return post || null
  },

  async addPost(payload: TCustomerPostPayload): Promise<IPost> {
    return await dbService.addPost(payload.content, payload.imageUrl, {
      id: payload.postId,
      pageId: payload.pageId,
    })
  },

  async addComment(payload: TCustomerCommentPayload): Promise<IComment | null> {
    return await dbService.addComment(payload.postId, payload.senderName, payload.text, {
      id: payload.commentId,
      parentId: payload.parentId ?? null,
    })
  },
}
