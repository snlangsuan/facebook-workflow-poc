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

// Event envelope TikTok POSTs to our webhook URL. TikTok sends a flat object;
// `content` is a JSON-encoded string whose shape depends on `event`
// (e.g. "authorization.removed", "video.publish.complete").
export const tiktokWebhookEventSchema = z.object({
  client_key: z.string().optional(),
  event: z.string(),
  create_time: z.number().optional(),
  user_openid: z.string().optional(),
  content: z.string().optional(),
})
