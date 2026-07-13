import { z } from 'zod'

export const webhookVerifyQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.challenge': z.string().optional(),
  'hub.verify_token': z.string().optional(),
})

export const messageReplyPayloadSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1),
})

export const commentReplyPayloadSchema = z.object({
  postId: z.string().min(1),
  text: z.string().min(1),
  // When set, reply to this specific comment; otherwise post a top-level comment.
  commentId: z.string().optional(),
})

export const hideCommentPayloadSchema = z.object({
  postId: z.string().min(1),
  commentId: z.string().min(1),
  hidden: z.boolean(),
})

export const likeCommentPayloadSchema = z.object({
  postId: z.string().min(1),
  commentId: z.string().min(1),
  liked: z.boolean(),
})

export const deleteCommentPayloadSchema = z.object({
  postId: z.string().min(1),
  commentId: z.string().min(1),
})

export const customerMessagePayloadSchema = z.object({
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  text: z.string().min(1),
  pageId: z.string().optional(),
})

export const customerCommentPayloadSchema = z.object({
  postId: z.string().min(1),
  senderName: z.string().min(1),
  text: z.string().min(1),
  commentId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  pageId: z.string().optional(),
})

export const customerPostPayloadSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().nullable(),
  postId: z.string().optional(),
  pageId: z.string().optional(),
})

export const importPostPayloadSchema = z.object({
  input: z.string().min(1), // Facebook post URL or post id
  pageId: z.string().optional(),
})

export const importInboxPayloadSchema = z.object({
  pageId: z.string().optional(),
})

export const conversationParamPayloadSchema = z.object({
  id: z.string().min(1),
})

export const postParamPayloadSchema = z.object({
  id: z.string().min(1),
})
