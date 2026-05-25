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
})

export const connectionParamPayloadSchema = z.object({
  userId: z.string().min(1),
})

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  apiKey: z.string().optional(),
})
