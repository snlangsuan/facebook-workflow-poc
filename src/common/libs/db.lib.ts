import { rtdb } from '#/common/libs/firebase.lib'
import { formatToIso, getUtcTime } from '#/common/utils/datetime.util'

export interface IFbPageConnection {
  id: string
  name: string
  accessToken: string
  userId: string
}

export interface IMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
}

export interface IConversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  updatedAt: string
  messages: IMessage[]
}

export interface IComment {
  id: string
  senderName: string
  text: string
  timestamp: string
}

export interface IPost {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  comments: IComment[]
}

export const dbService = {
  getConnections: async (): Promise<IFbPageConnection[]> => {
    const snapshot = await rtdb.ref('connections').once('value')
    const val = snapshot.val() as Record<string, IFbPageConnection> | null
    return val ? Object.values(val) : []
  },

  getConnectionByUserId: async (userId: string): Promise<IFbPageConnection | undefined> => {
    const snapshot = await rtdb.ref(`connections/${userId}`).once('value')
    return (snapshot.val() as IFbPageConnection | null) || undefined
  },

  saveConnection: async (connection: IFbPageConnection): Promise<void> => {
    await rtdb.ref(`connections/${connection.userId}`).set(connection)
  },

  deleteConnection: async (userId: string): Promise<void> => {
    await rtdb.ref(`connections/${userId}`).remove()
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
    }

    if (!conv) {
      conv = {
        id: convId,
        name: convName,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(convName)}`,
        lastMessage: text,
        updatedAt: timestamp,
        messages: [newMessage],
      }
    } else {
      if (!conv.messages) {
        conv.messages = []
      }
      conv.messages.push(newMessage)
      conv.lastMessage = text
      conv.updatedAt = timestamp
    }

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

  addPost: async (content: string, imageUrl: string | null): Promise<IPost> => {
    const id = `post_${getUtcTime().valueOf()}`
    const post: IPost = {
      id,
      content,
      imageUrl,
      createdAt: formatToIso(),
      comments: [],
    }
    await rtdb.ref(`posts/${id}`).set(post)
    return post
  },

  addComment: async (postId: string, senderName: string, text: string): Promise<IComment | null> => {
    const ref = rtdb.ref(`posts/${postId}`)
    const snapshot = await ref.once('value')
    const post = snapshot.val() as IPost | null
    if (!post) {
      return null
    }

    const comment: IComment = {
      id: `comment_${getUtcTime().valueOf()}`,
      senderName,
      text,
      timestamp: formatToIso(),
    }

    if (!post.comments) {
      post.comments = []
    }
    post.comments.push(comment)
    await ref.set(post)
    return comment
  },

  resetMockData: async (): Promise<void> => {
    await rtdb.ref('connections').remove()
    await rtdb.ref('conversations').remove()
    await rtdb.ref('posts').remove()
  },
}
