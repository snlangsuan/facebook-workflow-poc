import crypto from 'node:crypto'

import { dbService } from '#/common/libs/db.lib'
import { logger } from '#/common/libs/logger.lib'
import { envVariables } from '#/factory'
import { tiktokRepository } from '#/features/tiktok/v1/tiktok.repository'

import type { ITiktokConnection } from '#/common/libs/db.lib'
import type {
  ITiktokTokenResponse,
  ITiktokUserInfo,
  TTiktokConfigResponse,
  TTiktokConnectionResponse,
  TTiktokWebhookEvent,
} from '#/features/tiktok/v1/tiktok.type'

interface ISignatureResult {
  valid: boolean
  reason: string
}

// TikTok Login Kit (OAuth 2.0 / open API v2) endpoints.
const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'

export const tiktokService = {
  /** Redirect URI registered with TikTok; defaults to this app's callback under BASE_URL. */
  redirectUri(): string {
    return envVariables.TIKTOK_REDIRECT_URI || `${envVariables.BASE_URL}/demo/api/v1/tiktok/callback`
  },

  isConfigured(): boolean {
    return (
      !!envVariables.TIKTOK_CLIENT_KEY &&
      envVariables.TIKTOK_CLIENT_KEY !== '<tiktok_client_key>' &&
      !!envVariables.TIKTOK_CLIENT_SECRET &&
      envVariables.TIKTOK_CLIENT_SECRET !== '<tiktok_client_secret>'
    )
  },

  getConfig(): TTiktokConfigResponse {
    return {
      clientKey: envVariables.TIKTOK_CLIENT_KEY,
      scope: envVariables.TIKTOK_SCOPE,
      redirectUri: tiktokService.redirectUri(),
    }
  },

  /** Build the TikTok consent-screen URL the browser is redirected to. */
  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: envVariables.TIKTOK_CLIENT_KEY,
      scope: envVariables.TIKTOK_SCOPE,
      response_type: 'code',
      redirect_uri: tiktokService.redirectUri(),
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  /** Exchange the one-time authorization code for an access token + open_id. */
  async exchangeCodeForToken(code: string): Promise<ITiktokTokenResponse | null> {
    try {
      const body = new URLSearchParams({
        client_key: envVariables.TIKTOK_CLIENT_KEY,
        client_secret: envVariables.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: tiktokService.redirectUri(),
      })
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      const data = (await res.json()) as ITiktokTokenResponse
      if (!res.ok || data.error || !data.access_token) {
        logger.error(data, 'TikTok token exchange failed')
        return null
      }
      return data
    } catch (error) {
      logger.error(error, 'TikTok token exchange request failure')
      return null
    }
  },

  /** Fetch the authenticated user's basic profile with a valid access token. */
  async getUserInfo(accessToken: string): Promise<ITiktokUserInfo | null> {
    try {
      const fields = 'open_id,union_id,avatar_url,display_name'
      const res = await fetch(`${USER_INFO_URL}?fields=${encodeURIComponent(fields)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = (await res.json()) as {
        data?: { user?: ITiktokUserInfo }
        error?: { code?: string; message?: string }
      }
      if (!res.ok || (data.error && data.error.code && data.error.code !== 'ok') || !data.data?.user) {
        logger.error(data, 'TikTok user info fetch failed')
        return null
      }
      return data.data.user
    } catch (error) {
      logger.error(error, 'TikTok user info request failure')
      return null
    }
  },

  /**
   * Full callback handling: code -> token -> profile -> persisted connection.
   * Returns the saved connection, or null on any failure along the way.
   */
  async completeLogin(code: string): Promise<TTiktokConnectionResponse | null> {
    const token = await tiktokService.exchangeCodeForToken(code)
    if (!token) return null

    const profile = await tiktokService.getUserInfo(token.access_token)

    const connection: ITiktokConnection = {
      openId: token.open_id,
      displayName: profile?.display_name || 'TikTok user',
      avatarUrl: profile?.avatar_url,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scope: token.scope,
      expiresIn: token.expires_in,
    }
    return tiktokRepository.save(connection)
  },

  async getConnection(openId: string): Promise<TTiktokConnectionResponse | undefined> {
    return tiktokRepository.get(openId)
  },

  async disconnect(openId: string): Promise<void> {
    await tiktokRepository.delete(openId)
  },

  /**
   * Validate the `TikTok-Signature` header on an inbound webhook. TikTok signs the
   * request as `t=<timestamp>,s=<hex>` where the HMAC-SHA256 is computed over
   * `<timestamp>.<rawBody>` with the app's client secret. Compared in constant time.
   * When the client secret is not configured (demo mode), validation is skipped so
   * the POC stays runnable.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): ISignatureResult {
    const secret = envVariables.TIKTOK_CLIENT_SECRET
    if (!secret || secret === '<tiktok_client_secret>') {
      return { valid: true, reason: 'skipped (client secret not configured)' }
    }
    if (!signatureHeader) {
      return { valid: false, reason: 'missing TikTok-Signature header' }
    }
    // Header looks like: "t=1633080200,s=abcdef...".
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((kv) => {
        const idx = kv.indexOf('=')
        return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()]
      }),
    )
    const timestamp = parts.t
    const received = parts.s
    if (!timestamp || !received) {
      return { valid: false, reason: 'malformed TikTok-Signature header' }
    }
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    const receivedBuf = Buffer.from(received, 'hex')
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      return { valid: false, reason: 'signature mismatch (check TIKTOK_CLIENT_SECRET)' }
    }
    return { valid: true, reason: 'ok' }
  },

  /**
   * Act on a verified TikTok webhook event. Currently handles `authorization.removed`
   * (user revoked access) by dropping the stored connection. Other events are logged
   * and acknowledged so TikTok does not retry. Idempotent per (event, open id, time).
   */
  async handleWebhookEvent(event: TTiktokWebhookEvent): Promise<void> {
    const openId = event.user_openid
    const eventId = `tiktok:${event.event}:${openId ?? 'unknown'}:${event.create_time ?? ''}`
    if (!(await dbService.markEventProcessedOnce(eventId))) {
      logger.info({ eventId }, 'Skipping duplicate TikTok webhook event')
      return
    }

    switch (event.event) {
      case 'authorization.removed':
        if (openId) {
          await tiktokRepository.delete(openId)
          logger.info({ openId }, '🔌 [TIKTOK] authorization removed — connection dropped')
        }
        return
      default:
        logger.info({ event: event.event, openId }, 'ℹ️ [TIKTOK] webhook event acknowledged (no handler)')
    }
  },
}
