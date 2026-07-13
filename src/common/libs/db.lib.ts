import { rtdb } from '#/common/libs/firebase.lib'
import { formatToIso, getUtcTime } from '#/common/utils/datetime.util'

export type TAutoReplyStatus = 'ok' | 'failed'

export interface IFbPageConnection {
  id: string
  name: string
  accessToken: string
  userId: string
  systemInstruction?: string
  subscribed?: boolean
  createdAt?: string
  // AI auto-reply toggles (undefined = enabled by default).
  autoReplyInbox?: boolean
  autoReplyComment?: boolean
}

/**
 * A TikTok account connected via Login Kit (OAuth 2.0). Stored separately from
 * Facebook page connections under `tiktok_connections/{openId}`.
 */
export interface ITiktokConnection {
  openId: string
  displayName: string
  avatarUrl?: string
  accessToken: string
  refreshToken?: string
  scope?: string
  expiresIn?: number
  createdAt?: string
}

export interface IMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  status?: 'sent' | 'failed'
  error?: string
}

export interface IConversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  updatedAt: string
  messages: IMessage[]
  pageId?: string
  autoReplyStatus?: TAutoReplyStatus
  autoReplyError?: string
  // Set when the customer's name/photo were resolved from the Graph API via
  // Business Asset User Profile Access (used to surface the fetch in the inbox UI).
  profileFetched?: boolean
  profileFetchedAt?: string
}

export interface IComment {
  id: string
  senderName: string
  text: string
  timestamp: string
  avatarUrl?: string
  fromId?: string
  parentId?: string | null
  status?: 'sent' | 'failed'
  error?: string
  hidden?: boolean
  liked?: boolean
}

export interface IPost {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  comments: IComment[]
  pageId?: string
  autoReplyStatus?: TAutoReplyStatus
  autoReplyError?: string
}

/**
 * Connections are stored per-user as a map of pageId -> connection so a single
 * user can connect more than one Facebook Page. Legacy data that stored a single
 * connection object directly under `connections/{userId}` is still read correctly.
 */
function flattenUserConnections(node: unknown): IFbPageConnection[] {
  if (!node || typeof node !== 'object') {
    return []
  }
  const obj = node as Record<string, unknown>
  // Legacy single-connection shape.
  if (typeof obj.accessToken === 'string') {
    return [obj as unknown as IFbPageConnection]
  }
  return Object.values(obj).filter(
    (v): v is IFbPageConnection =>
      !!v && typeof v === 'object' && typeof (v as IFbPageConnection).accessToken === 'string',
  )
}

interface IIncomingComment {
  id: string
  senderName: string
  text: string
  timestamp?: string
  parentId?: string | null
  avatarUrl?: string
  fromId?: string
}

/** Update an existing comment's Facebook-sourced fields, or build a new one. */
function mergeIncomingComment(existing: IComment | undefined, inc: IIncomingComment): IComment {
  if (existing) {
    existing.senderName = inc.senderName
    existing.text = inc.text
    existing.parentId = inc.parentId ?? existing.parentId ?? null
    if (inc.fromId) existing.fromId = inc.fromId
    if (inc.avatarUrl) existing.avatarUrl = inc.avatarUrl
    if (inc.timestamp) existing.timestamp = formatToIso(inc.timestamp)
    return existing
  }
  return {
    id: inc.id,
    senderName: inc.senderName,
    text: inc.text,
    timestamp: inc.timestamp ? formatToIso(inc.timestamp) : formatToIso(),
    parentId: inc.parentId ?? null,
    ...(inc.fromId ? { fromId: inc.fromId } : {}),
    ...(inc.avatarUrl ? { avatarUrl: inc.avatarUrl } : {}),
  }
}

export const dbService = {
  getConnections: async (): Promise<IFbPageConnection[]> => {
    const snapshot = await rtdb.ref('connections').once('value')
    const val = snapshot.val() as Record<string, unknown> | null
    if (!val) {
      return []
    }
    return Object.values(val).flatMap((userNode) => flattenUserConnections(userNode))
  },

  getConnectionsByUserId: async (userId: string): Promise<IFbPageConnection[]> => {
    const snapshot = await rtdb.ref(`connections/${userId}`).once('value')
    return flattenUserConnections(snapshot.val())
  },

  getConnectionByPageId: async (pageId: string): Promise<IFbPageConnection | undefined> => {
    const all = await dbService.getConnections()
    return all.find((c) => c.id === pageId)
  },

  saveConnection: async (connection: IFbPageConnection): Promise<void> => {
    const ref = rtdb.ref(`connections/${connection.userId}/${connection.id}`)
    const existing = (await ref.once('value')).val() as IFbPageConnection | null
    // RTDB rejects `undefined` values, so only include optional fields when present.
    const record: IFbPageConnection = {
      id: connection.id,
      name: connection.name,
      accessToken: connection.accessToken,
      userId: connection.userId,
      createdAt: existing?.createdAt ?? formatToIso(),
    }
    const systemInstruction = connection.systemInstruction ?? existing?.systemInstruction
    if (systemInstruction !== undefined) {
      record.systemInstruction = systemInstruction
    }
    if (connection.subscribed !== undefined) {
      record.subscribed = connection.subscribed
    }
    // Preserve AI toggles across reconnects.
    const autoReplyInbox = connection.autoReplyInbox ?? existing?.autoReplyInbox
    if (autoReplyInbox !== undefined) {
      record.autoReplyInbox = autoReplyInbox
    }
    const autoReplyComment = connection.autoReplyComment ?? existing?.autoReplyComment
    if (autoReplyComment !== undefined) {
      record.autoReplyComment = autoReplyComment
    }
    await ref.set(record)
  },

  setSubscribed: async (userId: string, pageId: string, subscribed: boolean): Promise<void> => {
    await rtdb.ref(`connections/${userId}/${pageId}/subscribed`).set(subscribed)
  },

  setSystemInstruction: async (userId: string, pageId: string, instruction: string): Promise<void> => {
    await rtdb.ref(`connections/${userId}/${pageId}/systemInstruction`).set(instruction)
  },

  setAutoReplySettings: async (
    userId: string,
    pageId: string,
    settings: { autoReplyInbox?: boolean; autoReplyComment?: boolean },
  ): Promise<void> => {
    const updates: Record<string, boolean> = {}
    if (settings.autoReplyInbox !== undefined) {
      updates.autoReplyInbox = settings.autoReplyInbox
    }
    if (settings.autoReplyComment !== undefined) {
      updates.autoReplyComment = settings.autoReplyComment
    }
    if (Object.keys(updates).length > 0) {
      await rtdb.ref(`connections/${userId}/${pageId}`).update(updates)
    }
  },

  deleteConnection: async (userId: string, pageId?: string): Promise<void> => {
    const path = pageId ? `connections/${userId}/${pageId}` : `connections/${userId}`
    await rtdb.ref(path).remove()
  },

  getConversations: async (): Promise<IConversation[]> => {
    const snapshot = await rtdb.ref('conversations').once('value')
    const val = snapshot.val() as Record<string, IConversation> | null
    const list = val ? Object.values(val) : []
    return list.sort((a, b) => getUtcTime(b.updatedAt).valueOf() - getUtcTime(a.updatedAt).valueOf())
  },

  getConversationById: async (id: string): Promise<IConversation | undefined> => {
    const snapshot = await rtdb.ref(`conversations/${id}`).once('value')
    return (snapshot.val() as IConversation | null) || undefined
  },

  addMessage: async (
    convId: string,
    convName: string,
    senderId: string,
    senderName: string,
    text: string,
    opts?: { pageId?: string; status?: 'sent' | 'failed'; error?: string },
  ): Promise<IConversation> => {
    const timestamp = formatToIso()
    const msgId = `msg_${getUtcTime().valueOf()}`
    const ref = rtdb.ref(`conversations/${convId}`)
    const snapshot = await ref.once('value')
    let conv = snapshot.val() as IConversation | null

    const newMessage: IMessage = {
      id: msgId,
      senderId,
      senderName,
      text,
      timestamp,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.error ? { error: opts.error } : {}),
    }

    if (!conv) {
      conv = {
        id: convId,
        name: convName,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(convName)}`,
        lastMessage: text,
        updatedAt: timestamp,
        messages: [newMessage],
        ...(opts?.pageId ? { pageId: opts.pageId } : {}),
      }
    } else {
      if (!conv.messages) {
        conv.messages = []
      }
      conv.messages.push(newMessage)
      conv.lastMessage = text
      conv.updatedAt = timestamp
      if (opts?.pageId) {
        conv.pageId = opts.pageId
      }
    }

    await ref.set(conv)
    return conv
  },

  /**
   * Update a conversation's display identity (name + profile photo) — used after
   * resolving the customer's real profile via Business Asset User Profile Access,
   * so the inbox shows who is messaging instead of a raw PSID.
   */
  updateConversationProfile: async (
    convId: string,
    name: string,
    avatar?: string,
    fetched?: boolean,
  ): Promise<IConversation | undefined> => {
    const ref = rtdb.ref(`conversations/${convId}`)
    const conv = (await ref.once('value')).val() as IConversation | null
    if (!conv) {
      return undefined
    }
    conv.name = name
    if (avatar) {
      conv.avatar = avatar
    }
    if (fetched) {
      conv.profileFetched = true
      conv.profileFetchedAt = formatToIso()
    }
    await ref.set(conv)
    return conv
  },

  setConversationAutoStatus: async (
    convId: string,
    status: TAutoReplyStatus,
    error?: string,
  ): Promise<IConversation | undefined> => {
    const ref = rtdb.ref(`conversations/${convId}`)
    const conv = (await ref.once('value')).val() as IConversation | null
    if (!conv) {
      return undefined
    }
    conv.autoReplyStatus = status
    conv.autoReplyError = error ?? ''
    await ref.set(conv)
    return conv
  },

  getPosts: async (): Promise<IPost[]> => {
    const snapshot = await rtdb.ref('posts').once('value')
    const val = snapshot.val() as Record<string, IPost> | null
    const list = val ? Object.values(val) : []
    return list.sort((a, b) => getUtcTime(b.createdAt).valueOf() - getUtcTime(a.createdAt).valueOf())
  },

  getPostById: async (id: string): Promise<IPost | undefined> => {
    const snapshot = await rtdb.ref(`posts/${id}`).once('value')
    return (snapshot.val() as IPost | null) || undefined
  },

  deletePost: async (id: string): Promise<void> => {
    await rtdb.ref(`posts/${id}`).remove()
  },

  addPost: async (
    content: string,
    imageUrl: string | null,
    opts?: { id?: string; pageId?: string },
  ): Promise<IPost> => {
    const id = opts?.id || `post_${getUtcTime().valueOf()}`
    const post: IPost = {
      id,
      content,
      imageUrl,
      createdAt: formatToIso(),
      comments: [],
      ...(opts?.pageId ? { pageId: opts.pageId } : {}),
    }
    await rtdb.ref(`posts/${id}`).set(post)
    return post
  },

  addComment: async (
    postId: string,
    senderName: string,
    text: string,
    opts?: {
      id?: string
      parentId?: string | null
      status?: 'sent' | 'failed'
      error?: string
      avatarUrl?: string
      timestamp?: string
      fromId?: string
    },
  ): Promise<IComment | null> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const snapshot = await ref.once('value')
    const post = snapshot.val() as IPost | null
    if (!post) {
      return null
    }

    const comment: IComment = {
      id: opts?.id || `comment_${getUtcTime().valueOf()}`,
      senderName,
      text,
      timestamp: opts?.timestamp ? formatToIso(opts.timestamp) : formatToIso(),
      parentId: opts?.parentId ?? null,
      ...(opts?.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
      ...(opts?.fromId ? { fromId: opts.fromId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.error ? { error: opts.error } : {}),
    }

    if (!post.comments) {
      post.comments = []
    }
    post.comments.push(comment)
    await ref.set(post)
    return comment
  },

  /**
   * Merge comments fetched from Facebook into a post: update metadata on existing
   * comments (id matched) and insert new ones, while preserving local-only fields
   * (hidden/status) and local-only comments (e.g. our own page replies not on FB).
   */
  mergeComments: async (
    postId: string,
    incoming: Array<{
      id: string
      senderName: string
      text: string
      timestamp?: string
      parentId?: string | null
      avatarUrl?: string
      fromId?: string
    }>,
  ): Promise<IPost | undefined> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const post = (await ref.once('value')).val() as IPost | null
    if (!post) {
      return undefined
    }
    const byId = new Map<string, IComment>((post.comments ?? []).map((c) => [c.id, c]))
    for (const inc of incoming) {
      byId.set(inc.id, mergeIncomingComment(byId.get(inc.id), inc))
    }
    post.comments = Array.from(byId.values())
    await ref.set(post)
    return post
  },

  setCommentHidden: async (postId: string, commentId: string, hidden: boolean): Promise<IPost | undefined> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const post = (await ref.once('value')).val() as IPost | null
    if (!post?.comments) {
      return undefined
    }
    const target = post.comments.find((c) => c.id === commentId)
    if (!target) {
      return undefined
    }
    target.hidden = hidden
    await ref.set(post)
    return post
  },

  setCommentLiked: async (postId: string, commentId: string, liked: boolean): Promise<IPost | undefined> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const post = (await ref.once('value')).val() as IPost | null
    if (!post?.comments) {
      return undefined
    }
    const target = post.comments.find((c) => c.id === commentId)
    if (!target) {
      return undefined
    }
    target.liked = liked
    await ref.set(post)
    return post
  },

  /**
   * Remove a comment (and any of its direct replies) from a post — mirrors Facebook,
   * where deleting a comment also removes the replies threaded under it.
   */
  deleteComment: async (postId: string, commentId: string): Promise<IPost | undefined> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const post = (await ref.once('value')).val() as IPost | null
    if (!post?.comments) {
      return undefined
    }
    post.comments = post.comments.filter((c) => c.id !== commentId && c.parentId !== commentId)
    await ref.set(post)
    return post
  },

  setPostAutoStatus: async (postId: string, status: TAutoReplyStatus, error?: string): Promise<IPost | undefined> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const post = (await ref.once('value')).val() as IPost | null
    if (!post) {
      return undefined
    }
    post.autoReplyStatus = status
    post.autoReplyError = error ?? ''
    await ref.set(post)
    return post
  },

  /**
   * Idempotency guard. Atomically marks an event id as processed and returns `true`
   * only the first time it is seen. Duplicate webhook deliveries return `false` and
   * should be skipped. Aborting the transaction (returning undefined) when a value
   * already exists yields `committed === false`.
   */
  markEventProcessedOnce: async (eventId: string): Promise<boolean> => {
    // Facebook ids (mid / comment_id) may contain ".", "/", "=" which are illegal in RTDB
    // keys, so encode to a key-safe form before using it as a path segment.
    const safeKey = Buffer.from(eventId).toString('base64url')
    const ref = rtdb.ref(`processed_events/${safeKey}`)
    const result = await ref.transaction((current) => {
      if (current) {
        return undefined
      }
      return { processedAt: formatToIso() }
    })
    return result.committed
  },

  getTiktokConnection: async (openId: string): Promise<ITiktokConnection | undefined> => {
    const snapshot = await rtdb.ref(`tiktok_connections/${openId}`).once('value')
    return (snapshot.val() as ITiktokConnection | null) || undefined
  },

  saveTiktokConnection: async (connection: ITiktokConnection): Promise<void> => {
    const ref = rtdb.ref(`tiktok_connections/${connection.openId}`)
    const existing = (await ref.once('value')).val() as ITiktokConnection | null
    // RTDB rejects `undefined` values, so only include optional fields when present.
    const record: ITiktokConnection = {
      openId: connection.openId,
      displayName: connection.displayName,
      accessToken: connection.accessToken,
      createdAt: existing?.createdAt ?? formatToIso(),
    }
    if (connection.avatarUrl !== undefined) record.avatarUrl = connection.avatarUrl
    if (connection.refreshToken !== undefined) record.refreshToken = connection.refreshToken
    if (connection.scope !== undefined) record.scope = connection.scope
    if (connection.expiresIn !== undefined) record.expiresIn = connection.expiresIn
    await ref.set(record)
  },

  deleteTiktokConnection: async (openId: string): Promise<void> => {
    await rtdb.ref(`tiktok_connections/${openId}`).remove()
  },

  resetMockData: async (): Promise<void> => {
    await rtdb.ref('connections').remove()
    await rtdb.ref('conversations').remove()
    await rtdb.ref('posts').remove()
    await rtdb.ref('processed_events').remove()
  },
}
