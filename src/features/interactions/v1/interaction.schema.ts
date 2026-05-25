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
})

export const customerMessagePayloadSchema = z.object({
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  text: z.string().min(1),
})

export const customerCommentPayloadSchema = z.object({
  postId: z.string().min(1),
  senderName: z.string().min(1),
  text: z.string().min(1),
})

export const customerPostPayloadSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().nullable(),
})

export const conversationParamPayloadSchema = z.object({
  id: z.string().min(1),
})

export const postParamPayloadSchema = z.object({
  id: z.string().min(1),
})
