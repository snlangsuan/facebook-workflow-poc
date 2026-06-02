import { dbService } from '#/common/libs/db.lib'
import { geminiService } from '#/common/libs/gemini.lib'
import { logger } from '#/common/libs/logger.lib'
import { envVariables } from '#/factory'
import { interactionRepository } from '#/features/interactions/v1/interaction.repository'

import type { IConversation, IComment, IFbPageConnection, IMessage, IPost } from '#/common/libs/db.lib'
import type { IGeminiHistoryItem } from '#/common/libs/gemini.lib'
import type {
  TCustomerPostPayload,
  TCustomerMessagePayload,
  TCustomerCommentPayload,
  TMessageReplyPayload,
  TCommentReplyPayload,
} from '#/features/interactions/v1/interaction.type'

const GRAPH = `https://graph.facebook.com/${envVariables.FACEBOOK_GRAPH_VERSION}`
const HISTORY_LIMIT = 10

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

/**
 * Best-effort extraction of a Graph post id ({page-id}_{post-id}) from a Facebook
 * post URL or a raw id. Handles the common URL shapes; falls back to the raw input.
 */
function extractPostId(input: string, pageId: string): string {
  const value = input.trim()
  // Already a Graph post id, e.g. 12345_67890
  if (/^\d+_\w+$/.test(value)) {
    return value
  }
  try {
    const u = new URL(value)
    const storyFbid = u.searchParams.get('story_fbid')
    const idParam = u.searchParams.get('id')
    if (storyFbid && idParam) {
      return `${idParam}_${storyFbid}`
    }
    if (storyFbid) {
      return `${pageId}_${storyFbid}`
    }
    // /{page}/posts/{postId}  or trailing /{numericId}
    const m = u.pathname.match(/\/posts\/(\w+)/) || u.pathname.match(/\/(\d+)\/?$/)
    const pid = m?.[1]
    if (pid) {
      return /^\d+$/.test(pid) ? `${pageId}_${pid}` : pid
    }
  } catch {
    // not a URL — fall through
  }
  return value
}

async function resolveConnection(pageId?: string): Promise<IFbPageConnection | undefined> {
  if (pageId) {
    const byPage = await dbService.getConnectionByPageId(pageId)
    if (byPage) {
      return byPage
    }
  }
  const conns = await dbService.getConnections()
  return conns[0]
}

function resolvePersona(conn?: IFbPageConnection): string {
  return conn?.systemInstruction?.trim() || envVariables.GEMINI_DEFAULT_PERSONA
}

function toHistory(messages: IMessage[]): IGeminiHistoryItem[] {
  return messages.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.senderId === 'page' ? 'model' : 'user',
    text: m.text,
  }))
}

async function sendMessengerReply(pageAccessToken: string, recipientId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH}/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = (await res.json()) as unknown as Record<string, unknown>
    throw new Error(`Messenger Send API error: ${JSON.stringify(err)}`)
  }
}

async function sendCommentReply(pageAccessToken: string, targetId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${targetId}/comments?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  if (!res.ok) {
    const err = (await res.json()) as unknown as Record<string, unknown>
    throw new Error(`Graph Comment API error: ${JSON.stringify(err)}`)
  }
}

export const interactionService = {
  async listConversations(): Promise<IConversation[]> {
    return interactionRepository.listConversations()
  },

  async getConversation(id: string): Promise<IConversation | null> {
    return interactionRepository.getConversation(id)
  },

  /**
   * Flow 6: store the incoming message, then auto-generate a contextual Gemini reply
   * (persona + recent conversation history) and send it back via the Messenger Send API.
   * On any failure the conversation is flagged `failed` for manual admin takeover.
   */
  async receiveCustomerMessage(payload: TCustomerMessagePayload): Promise<IConversation> {
    const conv = await interactionRepository.addMessage(
      payload.senderId,
      payload.senderName,
      payload.senderId,
      payload.senderName,
      payload.text,
      { pageId: payload.pageId },
    )
    sseBroker.broadcast('conversation_updated', conv)

    const conn = await resolveConnection(payload.pageId)
    try {
      const previousMessages = conv.messages.slice(0, -1)
      const reply = await geminiService.generateReply({
        systemInstruction: resolvePersona(conn),
        history: toHistory(previousMessages),
        message: payload.text,
      })

      if (conn?.accessToken) {
        await sendMessengerReply(conn.accessToken, payload.senderId, reply)
      } else {
        logger.warn('No page connection/token available; storing Gemini reply without sending')
      }

      const updated = await interactionRepository.addMessage(
        payload.senderId,
        conv.name,
        'page',
        'AI Assistant',
        reply,
        { pageId: payload.pageId, status: 'sent' },
      )
      await dbService.setConversationAutoStatus(payload.senderId, 'ok')
      sseBroker.broadcast('conversation_updated', { ...updated, autoReplyStatus: 'ok' })
      return updated
    } catch (error) {
      const err = error as Error
      logger.error(err, 'Auto-reply (message) failed; flagging for manual takeover')
      const failed = await dbService.setConversationAutoStatus(payload.senderId, 'failed', err.message)
      sseBroker.broadcast('conversation_updated', failed ?? conv)
      return failed ?? conv
    }
  },

  async replyToMessage(payload: TMessageReplyPayload): Promise<IConversation | null> {
    const conv = await interactionRepository.getConversation(payload.conversationId)
    if (!conv) {
      return null
    }

    const conn = await resolveConnection(conv.pageId)
    if (conn?.accessToken) {
      try {
        await sendMessengerReply(conn.accessToken, payload.conversationId, payload.text)
      } catch (error) {
        logger.error(error, 'Manual Messenger reply failed')
      }
    }

    const updated = await interactionRepository.addMessage(
      payload.conversationId,
      conv.name,
      'page',
      'Page Admin',
      payload.text,
      { pageId: conv.pageId, status: 'sent' },
    )
    // Admin has taken over, clear the failed flag.
    await dbService.setConversationAutoStatus(payload.conversationId, 'ok')
    sseBroker.broadcast('conversation_updated', { ...updated, autoReplyStatus: 'ok' })
    return updated
  },

  async listPosts(): Promise<IPost[]> {
    return interactionRepository.listPosts()
  },

  async getPost(id: string): Promise<IPost | null> {
    return interactionRepository.getPost(id)
  },

  /**
   * Import a post by Facebook URL (or post id) using the Graph API: fetches the post
   * content and its comments, then stores them locally (deduped). Lets admins pull a
   * specific post into the system without waiting for webhooks.
   */
  async importPost(input: string, pageId?: string): Promise<IPost> {
    const conn = await resolveConnection(pageId)
    if (!conn?.accessToken) {
      throw new Error('No connected page with a valid access token')
    }

    const postId = extractPostId(input, conn.id)

    // Early guard: a page post id is "{owningPageId}_{postId}". If the prefix is a
    // different page id, reject before fetching anything.
    const ownerPrefix = postId.includes('_') ? postId.split('_')[0] : ''
    if (ownerPrefix && /^\d+$/.test(ownerPrefix) && ownerPrefix !== conn.id) {
      throw new Error('This post does not belong to the selected page.')
    }

    const url =
      `${GRAPH}/${postId}?fields=from,message,full_picture,created_time,` +
      `comments.limit(100){id,from,message,created_time,parent}&access_token=${conn.accessToken}`
    const res = await fetch(url)
    const data = (await res.json()) as {
      error?: { message?: string }
      from?: { id?: string; name?: string }
      message?: string
      full_picture?: string
      comments?: { data?: Array<{ id: string; from?: { name?: string }; message?: string; parent?: { id?: string } }> }
    }
    if (!res.ok || data.error) {
      logger.error(data.error ?? data, 'Failed to import post from Graph API')
      throw new Error(data.error?.message || 'Could not fetch this post. Check the URL/permissions.')
    }

    // Authoritative check: the post's author (`from`) must be the connected page.
    if (data.from?.id && data.from.id !== conn.id) {
      throw new Error('This post does not belong to the selected page.')
    }

    // Upsert the post.
    let post = await interactionRepository.getPost(postId)
    if (!post) {
      post = await interactionRepository.addPost({
        content: data.message || '(no text)',
        imageUrl: data.full_picture || null,
        postId,
        pageId: conn.id,
      })
    }

    // Add only comments we don't already have.
    const existingIds = new Set((post.comments || []).map((c) => c.id))
    for (const cm of data.comments?.data ?? []) {
      if (!cm.message || existingIds.has(cm.id)) {
        continue
      }
      await dbService.addComment(postId, cm.from?.name || 'User', cm.message, {
        id: cm.id,
        parentId: cm.parent?.id ?? null,
      })
    }

    const updated = (await interactionRepository.getPost(postId)) as IPost
    sseBroker.broadcast('posts_updated', updated)
    sseBroker.broadcast('post_updated', updated)
    return updated
  },

  async receiveCustomerPost(payload: TCustomerPostPayload): Promise<IPost> {
    // Avoid overwriting a post (and its comments) that was already seeded — e.g. when a
    // comment webhook arrived before the post-creation webhook.
    if (payload.postId) {
      const existing = await interactionRepository.getPost(payload.postId)
      if (existing) {
        return existing
      }
    }
    const post = await interactionRepository.addPost(payload)
    sseBroker.broadcast('posts_updated', post)
    return post
  },

  /**
   * Ensure the post that a comment belongs to exists locally. If the post-creation
   * webhook was never captured (Facebook may send `item: status` etc.), fetch the post
   * from the Graph API and seed it so the comment can attach. Falls back to a placeholder.
   */
  async ensurePostExists(postId: string, pageId?: string): Promise<IPost> {
    const existing = await interactionRepository.getPost(postId)
    if (existing) {
      return existing
    }

    const conn = await resolveConnection(pageId)
    let content = '(Facebook post)'
    let imageUrl: string | null = null
    if (conn?.accessToken) {
      try {
        const res = await fetch(`${GRAPH}/${postId}?fields=message,full_picture&access_token=${conn.accessToken}`)
        if (res.ok) {
          const data = (await res.json()) as { message?: string; full_picture?: string }
          content = data.message || content
          imageUrl = data.full_picture || null
        }
      } catch (error) {
        logger.error(error, 'Failed to fetch post details from Graph API')
      }
    }

    const post = await interactionRepository.addPost({ content, imageUrl, postId, pageId })
    sseBroker.broadcast('posts_updated', post)
    return post
  },

  /**
   * Flow 5: store the incoming comment, then auto-generate a Gemini reply and post it
   * back to the originating comment via the Graph API. Failures flag the post `failed`.
   */
  async receiveCustomerComment(payload: TCustomerCommentPayload): Promise<IComment | null> {
    // Self-heal: make sure the post exists before attaching the comment.
    await interactionService.ensurePostExists(payload.postId, payload.pageId)

    const comment = await interactionRepository.addComment(payload)
    if (!comment) {
      return null
    }

    const post = await interactionRepository.getPost(payload.postId)
    if (post) {
      sseBroker.broadcast('post_updated', post)
    }

    const conn = await resolveConnection(post?.pageId)
    try {
      const reply = await geminiService.generateReply({
        systemInstruction: resolvePersona(conn),
        message: payload.text,
      })

      if (conn?.accessToken) {
        // Reply to the specific comment when its id is known, else to the post.
        await sendCommentReply(conn.accessToken, payload.commentId || payload.postId, reply)
      } else {
        logger.warn('No page connection/token available; storing Gemini comment reply without sending')
      }

      await dbService.addComment(payload.postId, 'AI Assistant', reply, {
        parentId: payload.commentId ?? null,
        status: 'sent',
      })
      const okPost = await dbService.setPostAutoStatus(payload.postId, 'ok')
      if (okPost) {
        sseBroker.broadcast('post_updated', okPost)
      }
      return comment
    } catch (error) {
      const err = error as Error
      logger.error(err, 'Auto-reply (comment) failed; flagging for manual takeover')
      const failedPost = await dbService.setPostAutoStatus(payload.postId, 'failed', err.message)
      if (failedPost) {
        sseBroker.broadcast('post_updated', failedPost)
      }
      return comment
    }
  },

  async replyToComment(payload: TCommentReplyPayload): Promise<IComment | null> {
    const post = await interactionRepository.getPost(payload.postId)
    const conn = await resolveConnection(post?.pageId)
    if (conn?.accessToken) {
      try {
        await sendCommentReply(conn.accessToken, payload.postId, payload.text)
      } catch (error) {
        logger.error(error, 'Manual comment reply failed')
      }
    }

    const comment = await dbService.addComment(payload.postId, 'Page Admin', payload.text, { status: 'sent' })
    if (!comment) {
      return null
    }

    await dbService.setPostAutoStatus(payload.postId, 'ok')
    const updatedPost = await interactionRepository.getPost(payload.postId)
    if (updatedPost) {
      sseBroker.broadcast('post_updated', updatedPost)
    }
    return comment
  },
}
