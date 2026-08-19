import { z } from 'zod'

import {
  tiktokCallbackQuerySchema,
  tiktokConfigResponseSchema,
  tiktokConnectionResponseSchema,
  tiktokWebhookEventSchema,
} from '#/features/tiktok/v1/tiktok.schema'

export type TTiktokCallbackQuery = z.infer<typeof tiktokCallbackQuerySchema>
export type TTiktokConfigResponse = z.infer<typeof tiktokConfigResponseSchema>
export type TTiktokConnectionResponse = z.infer<typeof tiktokConnectionResponseSchema>
export type TTiktokWebhookEvent = z.infer<typeof tiktokWebhookEventSchema>

// Shape returned by POST https://open.tiktokapis.com/v2/oauth/token/
export interface ITiktokTokenResponse {
  access_token: string
  refresh_token?: string
  open_id: string
  scope?: string
  expires_in?: number
  refresh_expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

// Shape returned by GET https://open.tiktokapis.com/v2/user/info/
export interface ITiktokUserInfo {
  open_id: string
  display_name: string
  avatar_url?: string
}
