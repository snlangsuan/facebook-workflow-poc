import { z } from 'zod'

import {
  connectionCreatePayloadSchema,
  connectionResponseSchema,
  connectionParamPayloadSchema,
  loginPayloadSchema,
} from '#/features/connections/v1/connection.schema'

export type TConnectionCreatePayload = z.infer<typeof connectionCreatePayloadSchema>
export type TConnectionResponse = z.infer<typeof connectionResponseSchema>
export type TConnectionParamPayload = z.infer<typeof connectionParamPayloadSchema>
export type TLoginPayload = z.infer<typeof loginPayloadSchema>
