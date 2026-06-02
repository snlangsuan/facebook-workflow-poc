import { firebase } from '#/common/libs/firebase.lib'
import { logger } from '#/common/libs/logger.lib'

import type { Context, MiddlewareHandler } from 'hono'

export function authMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    const authHeader = c.req.header('Authorization')
    // EventSource (SSE) cannot send custom headers, so also accept the Firebase token
    // via the `access_token` query param for endpoints consumed by EventSource (/events).
    // NOTE: a dedicated name is used (not `token`) so it never collides with other
    // endpoints that already use `?token=` for a different value (e.g. /connections/pages
    // passes the Facebook user token as `token`).
    const queryToken = c.req.query('access_token')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken

    if (!token) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

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
