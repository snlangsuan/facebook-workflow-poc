import { signInWithEmailAndPassword } from 'firebase/auth'

import { getClientAuth } from '#/common/libs/firebase-client.lib'
import { logger } from '#/common/libs/logger.lib'
import { connectionRepository } from '#/features/connections/v1/connection.repository'

import type {
  TConnectionCreatePayload,
  TConnectionResponse,
  TLoginPayload,
} from '#/features/connections/v1/connection.type'

export const connectionService = {
  async getConnection(userId: string): Promise<TConnectionResponse | null> {
    return connectionRepository.getByUserId(userId)
  },

  async saveConnection(payload: TConnectionCreatePayload): Promise<TConnectionResponse> {
    return connectionRepository.save(payload)
  },

  async deleteConnection(userId: string): Promise<void> {
    await connectionRepository.delete(userId)
  },

  async getAvailablePages(userAccessToken?: string): Promise<Array<{ id: string; name: string; accessToken: string }>> {
    if (userAccessToken) {
      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`)
        if (!res.ok) {
          const err = (await res.json()) as unknown as Record<string, unknown>
          logger.error(err, 'Failed to fetch Facebook accounts')
          throw new Error('Failed to fetch Facebook accounts')
        }
        const data = (await res.json()) as unknown as {
          data: Array<{ id: string; name: string; access_token: string }>
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
    }

    return []
  },

  async login(payload: TLoginPayload): Promise<{ token: string; userId: string; email: string }> {
    try {
      const authInstance = getClientAuth(payload.apiKey)
      const userCredential = await signInWithEmailAndPassword(authInstance, payload.email, payload.password)
      const token = await userCredential.user.getIdToken()
      return {
        token,
        userId: userCredential.user.uid,
        email: userCredential.user.email || payload.email,
      }
    } catch (error) {
      logger.error(error as Error, 'Firebase SDK Authentication failure')
      throw new Error('Invalid email or password', { cause: error })
    }
  },
}
