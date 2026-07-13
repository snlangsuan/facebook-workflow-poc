import { signInWithEmailAndPassword } from 'firebase/auth'

import { dbService } from '#/common/libs/db.lib'
import { getClientAuth } from '#/common/libs/firebase-client.lib'
import { logger } from '#/common/libs/logger.lib'
import { tokenForLog } from '#/common/utils/token.util'
import { envVariables } from '#/factory'
import { connectionRepository } from '#/features/connections/v1/connection.repository'

import type {
  TConnectionCreatePayload,
  TConnectionResponse,
  TLoginPayload,
} from '#/features/connections/v1/connection.type'

const GRAPH = `https://graph.facebook.com/${envVariables.FACEBOOK_GRAPH_VERSION}`

export const connectionService = {
  async getConnections(userId: string): Promise<TConnectionResponse[]> {
    return connectionRepository.listByUserId(userId)
  },

  async saveConnection(payload: TConnectionCreatePayload): Promise<TConnectionResponse> {
    const conn = await connectionRepository.save(payload)
    // Auto-subscribe the page to `feed` and `messages` webhook events immediately.
    const subscribed = await connectionService.subscribePageToWebhook(payload.pageId, payload.accessToken)
    if (subscribed) {
      await connectionRepository.setSubscribed(payload.userId, payload.pageId, true)
    }
    return { ...conn, subscribed }
  },

  async deleteConnection(userId: string, pageId?: string): Promise<void> {
    // When removing a specific page, also unsubscribe it from the app's webhook
    // so Facebook stops delivering events for it.
    if (pageId) {
      const conn = await dbService.getConnectionByPageId(pageId)
      if (conn?.accessToken) {
        await connectionService.unsubscribePageFromWebhook(pageId, conn.accessToken)
      }
    }
    await connectionRepository.delete(userId, pageId)

    // Clean up ALL cached page-scoped data tied to the removed connection so nothing stale
    // (conversations, feed posts) references a page whose token is gone. Page-scoped delete
    // removes just that page; a full disconnect wipes everything including dedup markers.
    if (pageId) {
      const [conversations, posts] = await Promise.all([
        dbService.deleteConversationsByPageId(pageId),
        dbService.deletePostsByPageId(pageId),
      ])
      logger.info({ pageId, conversations, posts }, '🧹 Cleared cached data for removed page')
    } else {
      await Promise.all([dbService.clearConversations(), dbService.clearPosts(), dbService.clearProcessedEvents()])
      logger.info({ userId }, '🧹 Cleared all cached data on full disconnect')
    }
  },

  async unsubscribePageFromWebhook(pageId: string, pageAccessToken: string): Promise<void> {
    try {
      const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${pageAccessToken}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = (await res.json()) as unknown as Record<string, unknown>
        logger.error(err, `Failed to unsubscribe page ${pageId} from webhook`)
      }
    } catch (error) {
      logger.error(error, 'Graph API unsubscribe failure')
    }
  },

  async setPersona(userId: string, pageId: string, instruction: string): Promise<void> {
    await connectionRepository.setSystemInstruction(userId, pageId, instruction)
  },

  async setAutoReplySettings(
    userId: string,
    pageId: string,
    settings: { autoReplyInbox?: boolean; autoReplyComment?: boolean },
  ): Promise<void> {
    await connectionRepository.setAutoReplySettings(userId, pageId, settings)
  },

  /**
   * POST /{page-id}/subscribed_apps with the Page Access Token to start receiving
   * `feed` and `messages` events. Returns true on success.
   */
  async subscribePageToWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,feed,mention',
          access_token: pageAccessToken,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as unknown as Record<string, unknown>
        logger.error(err, `Failed to subscribe page ${pageId} to webhook`)
        return false
      }
      return true
    } catch (error) {
      logger.error(error, 'Graph API subscribed_apps failure')
      return false
    }
  },

  /**
   * Token lifecycle: short-lived user token -> long-lived user token (~60 days)
   * -> long-lived Page Access Tokens (never expiring) for every page the user manages.
   */
  async getAvailablePages(
    shortLivedUserToken?: string,
  ): Promise<Array<{ id: string; name: string; accessToken: string }>> {
    if (!shortLivedUserToken) {
      return []
    }

    try {
      const longLivedUserToken = await connectionService.exchangeForLongLivedUserToken(shortLivedUserToken)
      const userToken = longLivedUserToken || shortLivedUserToken
      logger.debug(
        {
          isLongLived: Boolean(longLivedUserToken),
          shortLivedUserToken: tokenForLog(shortLivedUserToken),
          userToken: tokenForLog(userToken),
        },
        '🔑 [TOKEN] user token for GET /me/accounts',
      )

      const res = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${userToken}`)
      if (!res.ok) {
        const err = (await res.json()) as unknown as Record<string, unknown>
        logger.error(err, 'Failed to fetch Facebook accounts')
        throw new Error('Failed to fetch Facebook accounts')
      }
      const data = (await res.json()) as unknown as {
        data: Array<{ id: string; name: string; access_token: string }>
      }
      // Page tokens derived from a long-lived user token are themselves long-lived
      // ("never expiring") page access tokens.
      for (const p of data.data) {
        logger.debug(
          { pageId: p.id, name: p.name, token: tokenForLog(p.access_token) },
          '🔑 [TOKEN] Page access token from /me/accounts',
        )
      }
      return data.data.map((p) => ({
        id: p.id,
        name: p.name,
        accessToken: p.access_token,
      }))
    } catch (error) {
      logger.error(error, 'Graph API accounts lookup failure')
      return []
    }
  },

  async exchangeForLongLivedUserToken(shortLivedUserToken: string): Promise<string | null> {
    if (!envVariables.FACEBOOK_APP_SECRET || envVariables.FACEBOOK_APP_SECRET === '<secret>') {
      logger.warn('FACEBOOK_APP_SECRET not configured; skipping long-lived token exchange')
      return null
    }
    try {
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: envVariables.FACEBOOK_APP_ID,
        client_secret: envVariables.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedUserToken,
      })
      const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`)
      if (!res.ok) {
        const err = (await res.json()) as unknown as Record<string, unknown>
        logger.error(err, 'Failed to exchange for long-lived user token')
        return null
      }
      const data = (await res.json()) as unknown as { access_token?: string }
      return data.access_token ?? null
    } catch (error) {
      logger.error(error, 'Graph API token exchange failure')
      return null
    }
  },

  async login(payload: TLoginPayload): Promise<{ token: string; refreshToken: string; userId: string; email: string }> {
    try {
      const authInstance = getClientAuth(payload.apiKey)
      const userCredential = await signInWithEmailAndPassword(authInstance, payload.email, payload.password)
      const token = await userCredential.user.getIdToken()
      return {
        token,
        // Returned so the browser can refresh the ID token via the secure-token endpoint
        // (Firebase ID tokens expire after ~1 hour).
        refreshToken: userCredential.user.refreshToken,
        userId: userCredential.user.uid,
        email: userCredential.user.email || payload.email,
      }
    } catch (error) {
      logger.error(error as Error, 'Firebase SDK Authentication failure')
      throw new Error('Invalid email or password', { cause: error })
    }
  },
}
