import { Hono } from 'hono'

import { tiktokController } from '#/features/tiktok/v1/tiktok.controller'
import {
  getTiktokConfigSpec,
  tiktokAuthorizeSpec,
  tiktokCallbackSpec,
  getTiktokConnectionSpec,
  disconnectTiktokSpec,
} from '#/features/tiktok/v1/tiktok.openapi'

export const tiktokRouter = new Hono()

tiktokRouter.get('/config', getTiktokConfigSpec, tiktokController.getConfig)

// Browser hits this to start the OAuth round-trip; we 302 to TikTok's consent screen.
tiktokRouter.get('/authorize', tiktokAuthorizeSpec, tiktokController.authorize)

// TikTok redirects back here with `code` + `state`.
tiktokRouter.get('/callback', tiktokCallbackSpec, tiktokController.callback)

tiktokRouter.get('/connections/:openId', getTiktokConnectionSpec, tiktokController.getConnection)

tiktokRouter.delete('/connections/:openId', disconnectTiktokSpec, tiktokController.disconnect)
