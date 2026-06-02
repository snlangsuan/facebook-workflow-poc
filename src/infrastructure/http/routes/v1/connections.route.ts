import { Hono } from 'hono'

import { authMiddleware } from '#/core/middlewares/auth.middleware'
import { zValidator } from '#/core/middlewares/validator.middleware'
import { connectionController } from '#/features/connections/v1/connection.controller'
import {
  getConnectionSpec,
  saveConnectionSpec,
  deleteConnectionSpec,
  setPersonaSpec,
  getAvailablePagesSpec,
  getConfigSpec,
  loginSpec,
} from '#/features/connections/v1/connection.openapi'
import {
  connectionCreatePayloadSchema,
  connectionParamPayloadSchema,
  personaParamPayloadSchema,
  personaUpdatePayloadSchema,
  loginPayloadSchema,
} from '#/features/connections/v1/connection.schema'

export const connectionsRouter = new Hono()

connectionsRouter.get('/config', getConfigSpec, connectionController.getConfig)

connectionsRouter.post('/login', loginSpec, zValidator('json', loginPayloadSchema), connectionController.login)

connectionsRouter.get('/pages', getAvailablePagesSpec, authMiddleware(), connectionController.getAvailablePages)

connectionsRouter.get(
  '/:userId',
  getConnectionSpec,
  authMiddleware(),
  zValidator('param', connectionParamPayloadSchema),
  connectionController.getConnection,
)

connectionsRouter.post(
  '/',
  saveConnectionSpec,
  authMiddleware(),
  zValidator('json', connectionCreatePayloadSchema),
  connectionController.saveConnection,
)

connectionsRouter.delete(
  '/:userId',
  deleteConnectionSpec,
  authMiddleware(),
  zValidator('param', connectionParamPayloadSchema),
  connectionController.deleteConnection,
)

connectionsRouter.patch(
  '/:userId/:pageId/persona',
  setPersonaSpec,
  authMiddleware(),
  zValidator('param', personaParamPayloadSchema),
  zValidator('json', personaUpdatePayloadSchema),
  connectionController.setPersona,
)
