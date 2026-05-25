import { firebase } from '#/common/libs/firebase.lib'
import { logger } from '#/common/libs/logger.lib'

import type { Context, MiddlewareHandler } from 'hono'

export function authMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)

    try {
      const decoded = await firebase.auth().verifyIdToken(token)
      c.set('user_id', decoded.uid)
      await next()
    } catch (error) {
      logger.error(error, 'Firebase token validation error')
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }
  }
}
