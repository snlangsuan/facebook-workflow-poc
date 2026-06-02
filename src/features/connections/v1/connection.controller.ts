import { successResponseSchema } from '#/common/schemas/share.schema'
import { connectionListResponseSchema } from '#/features/connections/v1/connection.schema'
import { connectionService } from '#/features/connections/v1/connection.service'

import type { JsonInputSchema, ParamInputSchema } from '#/common/types/app.type'
import type {
  TConnectionCreatePayload,
  TConnectionParamPayload,
  TConnectionResponse,
  TPersonaParamPayload,
  TPersonaUpdatePayload,
  TLoginPayload,
} from '#/features/connections/v1/connection.type'
import type { Context, Env, Input } from 'hono'

export const connectionController = {
  getConnection: async <E extends Env, P extends string, I extends Input & ParamInputSchema<TConnectionParamPayload>>(
    c: Context<E, P, I>,
  ) => {
    const { userId } = c.req.valid('param')
    const conns = await connectionService.getConnections(userId)
    return c.json(connectionListResponseSchema.parse(conns))
  },

  saveConnection: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TConnectionCreatePayload>>(
    c: Context<E, P, I>,
  ) => {
    const payload = c.req.valid('json')
    const conn = await connectionService.saveConnection(payload)
    return c.json<TConnectionResponse>(conn)
  },

  deleteConnection: async <
    E extends Env,
    P extends string,
    I extends Input & ParamInputSchema<TConnectionParamPayload>,
  >(
    c: Context<E, P, I>,
  ) => {
    const { userId } = c.req.valid('param')
    const pageId = c.req.query('pageId')
    await connectionService.deleteConnection(userId, pageId)
    return c.json(successResponseSchema.parse({ success: true }))
  },

  setPersona: async <
    E extends Env,
    P extends string,
    I extends Input & ParamInputSchema<TPersonaParamPayload> & JsonInputSchema<TPersonaUpdatePayload>,
  >(
    c: Context<E, P, I>,
  ) => {
    const { userId, pageId } = c.req.valid('param')
    const { systemInstruction } = c.req.valid('json')
    await connectionService.setPersona(userId, pageId, systemInstruction)
    return c.json(successResponseSchema.parse({ success: true }))
  },

  getAvailablePages: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const token = c.req.query('token')
    const pages = await connectionService.getAvailablePages(token)
    return c.json(pages)
  },

  getConfig: async <E extends Env, P extends string, I extends Input>(c: Context<E, P, I>) => {
    const { envVariables } = await import('#/factory')
    return c.json({
      appId: envVariables.FACEBOOK_APP_ID,
      projectId: envVariables.GOOGLE_PROJECT_ID,
      // Public Firebase Web API key — used by the browser to refresh ID tokens.
      firebaseApiKey: envVariables.FIREBASE_WEB_API_KEY ?? '',
      // Graph API version — single source of truth so the JS SDK matches the backend.
      graphVersion: envVariables.FACEBOOK_GRAPH_VERSION,
    })
  },

  login: async <E extends Env, P extends string, I extends Input & JsonInputSchema<TLoginPayload>>(
    c: Context<E, P, I>,
  ) => {
    try {
      const payload = c.req.valid('json')
      const result = await connectionService.login(payload)
      return c.json({
        success: true,
        ...result,
      })
    } catch (error) {
      const err = error as Error
      return c.json(
        {
          success: false,
          error: err.message || 'Authentication failed',
        },
        401,
      )
    }
  },
}
