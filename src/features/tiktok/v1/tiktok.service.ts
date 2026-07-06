import { logger } from '#/common/libs/logger.lib'
import { envVariables } from '#/factory'
import { tiktokRepository } from '#/features/tiktok/v1/tiktok.repository'

import type { ITiktokConnection } from '#/common/libs/db.lib'
import type {
  ITiktokTokenResponse,
  ITiktokUserInfo,
  TTiktokConfigResponse,
  TTiktokConnectionResponse,
} from '#/features/tiktok/v1/tiktok.type'

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
}
