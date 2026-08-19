import { randomUUID } from 'node:crypto'

import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { logger } from '#/common/libs/logger.lib'
import { tiktokConnectionResponseSchema, tiktokWebhookEventSchema } from '#/features/tiktok/v1/tiktok.schema'
import { tiktokService } from '#/features/tiktok/v1/tiktok.service'

import type { TTiktokCallbackQuery } from '#/features/tiktok/v1/tiktok.type'
import type { Context, Env, Input } from 'hono'

// CSRF state cookie — set before redirecting to TikTok, verified on the way back.
const STATE_COOKIE = 'tiktok_oauth_state'
// Where the browser lands after the OAuth round-trip (the dedicated TikTok page).
const FRONTEND_PATH = '/demo/tiktok.html'

function redirectToFrontend(c: Context, params: Record<string, string>): Response {
  const qs = new URLSearchParams(params).toString()
  return c.redirect(`${FRONTEND_PATH}?${qs}`)
}

export const tiktokController = {
  getConfig: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    return c.json(tiktokService.getConfig())
  },

  authorize: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    if (!tiktokService.isConfigured()) {
      return redirectToFrontend(c, {
        status: 'error',
        reason: 'TikTok Login Kit is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.',
      })
    }
    const state = randomUUID()
    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      // Lax so the cookie is still sent on the top-level GET redirect back from TikTok.
      sameSite: 'Lax',
      path: '/demo',
      maxAge: 600,
      secure: c.req.url.startsWith('https://'),
    })
    return c.redirect(tiktokService.buildAuthorizeUrl(state))
  },

  callback: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const { code, state, error, error_description } = c.req.query() as TTiktokCallbackQuery

    const expectedState = getCookie(c, STATE_COOKIE)
    deleteCookie(c, STATE_COOKIE, { path: '/demo' })

    if (error) {
      return redirectToFrontend(c, { status: 'error', reason: error_description || error })
    }
    if (!state || !expectedState || state !== expectedState) {
      return redirectToFrontend(c, { status: 'error', reason: 'Invalid OAuth state. Please try again.' })
    }
    if (!code) {
      return redirectToFrontend(c, { status: 'error', reason: 'Missing authorization code.' })
    }

    const connection = await tiktokService.completeLogin(code)
    if (!connection) {
      return redirectToFrontend(c, { status: 'error', reason: 'Failed to complete TikTok login.' })
    }

    return redirectToFrontend(c, {
      status: 'success',
      open_id: connection.openId,
      name: connection.displayName,
      ...(connection.avatarUrl ? { avatar: connection.avatarUrl } : {}),
    })
  },

  getConnection: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const openId = c.req.param('openId')
    if (!openId) {
      return c.json({ success: false, error: 'Missing open id' }, 400)
    }
    const conn = await tiktokService.getConnection(openId)
    if (!conn) {
      return c.json({ success: false, error: 'TikTok connection not found' }, 404)
    }
    return c.json(tiktokConnectionResponseSchema.parse(conn))
  },

  disconnect: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const openId = c.req.param('openId')
    if (!openId) {
      return c.json({ success: false, error: 'Missing open id' }, 400)
    }
    await tiktokService.disconnect(openId)
    return c.json({ success: true })
  },

  webhook: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    // Read the raw body first so the TikTok-Signature can be verified against the exact bytes.
    const rawBody = await c.req.text()
    const sig = tiktokService.verifyWebhookSignature(rawBody, c.req.header('tiktok-signature'))

    if (!sig.valid) {
      logger.warn({ reason: sig.reason, preview: rawBody.slice(0, 400) }, '❌ [TIKTOK] webhook signature INVALID (401)')
      return c.json({ success: false, error: 'Invalid signature' }, 401)
    }

    let json: unknown
    try {
      json = JSON.parse(rawBody || '{}')
    } catch {
      logger.warn({ preview: rawBody.slice(0, 400) }, '⚠️ [TIKTOK] webhook invalid JSON (400)')
      return c.json({ success: false, error: 'Invalid JSON payload' }, 400)
    }

    const parsed = tiktokWebhookEventSchema.safeParse(json)
    if (!parsed.success) {
      logger.warn({ preview: rawBody.slice(0, 400) }, '⚠️ [TIKTOK] webhook payload not recognised (400)')
      return c.json({ success: false, error: 'Unknown event payload' }, 400)
    }

    logger.info(
      { event: parsed.data.event, openId: parsed.data.user_openid, signatureValid: sig.valid },
      '📥 [TIKTOK] webhook received',
    )
    await tiktokService.handleWebhookEvent(parsed.data)
    return c.json({ success: true })
  },
}
