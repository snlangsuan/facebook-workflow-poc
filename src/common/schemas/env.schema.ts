import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['local', 'test', 'development', 'production']).default('local'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(8000),
  BASE_URL: z.url(),
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_LOCATION: z.string().default('us-central1'),
  GOOGLE_AUTH_CLIENT_EMAIL: z.string(),
  GOOGLE_AUTH_PRIVATE_KEY: z.string(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  FACEBOOK_APP_ID: z.string().default('4503288803286309'),
  FACEBOOK_APP_SECRET: z.string().default('<secret>'),
  FACEBOOK_VERIFY_TOKEN: z.string().default('facebook_verify_token_123'),
  FACEBOOK_GRAPH_VERSION: z.string().default('v25.0'),
  // Debug-only: when 'true', emit the 🔑 [TOKEN] debug logs that print access tokens.
  // Off by default so tokens are never logged unless explicitly enabled for debugging.
  DEBUG_TOKEN: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  // TikTok Login Kit (OAuth 2.0). Configure these in the TikTok for Developers console.
  TIKTOK_CLIENT_KEY: z.string().default('<tiktok_client_key>'),
  TIKTOK_CLIENT_SECRET: z.string().default('<tiktok_client_secret>'),
  // Space/comma separated scopes requested at authorize time.
  TIKTOK_SCOPE: z.string().default('user.info.basic'),
  // Optional explicit redirect URI. Falls back to `${BASE_URL}/demo/api/v1/tiktok/callback`.
  TIKTOK_REDIRECT_URI: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_DEFAULT_PERSONA: z
    .string()
    .default(
      'You are a friendly, professional customer-support assistant for a Facebook Page. ' +
        'Reply politely and concisely in the same language as the customer. ' +
        'Do not invent prices, promotions, or policies you are not certain about.',
    ),
})
