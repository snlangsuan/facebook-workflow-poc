import { z } from 'zod'

// Query params TikTok appends when redirecting back to our callback.
// On success: `code` + `state`. On denial/error: `error` + `error_description`.
export const tiktokCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  scopes: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const tiktokConfigResponseSchema = z.object({
  clientKey: z.string(),
  scope: z.string(),
  redirectUri: z.string(),
})

export const tiktokConnectionResponseSchema = z.object({
  openId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  scope: z.string().optional(),
})
