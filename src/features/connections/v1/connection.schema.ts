import { z } from 'zod'

export const connectionCreatePayloadSchema = z.object({
  userId: z.string().min(1),
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  accessToken: z.string().min(1),
})

export const connectionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  accessToken: z.string(),
  userId: z.string(),
  systemInstruction: z.string().optional(),
  subscribed: z.boolean().optional(),
  autoReplyInbox: z.boolean().optional(),
  autoReplyComment: z.boolean().optional(),
})

export const connectionListResponseSchema = z.array(connectionResponseSchema)

export const connectionParamPayloadSchema = z.object({
  userId: z.string().min(1),
})

export const personaParamPayloadSchema = z.object({
  userId: z.string().min(1),
  pageId: z.string().min(1),
})

export const personaUpdatePayloadSchema = z.object({
  systemInstruction: z.string().min(1),
})

export const settingsUpdatePayloadSchema = z
  .object({
    autoReplyInbox: z.boolean().optional(),
    autoReplyComment: z.boolean().optional(),
  })
  .refine((v) => v.autoReplyInbox !== undefined || v.autoReplyComment !== undefined, {
    message: 'At least one setting is required',
  })

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  apiKey: z.string().optional(),
})
