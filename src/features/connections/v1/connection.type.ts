import { z } from 'zod'

import {
  connectionCreatePayloadSchema,
  connectionResponseSchema,
  connectionParamPayloadSchema,
  personaParamPayloadSchema,
  personaUpdatePayloadSchema,
  settingsUpdatePayloadSchema,
  loginPayloadSchema,
} from '#/features/connections/v1/connection.schema'

export type TConnectionCreatePayload = z.infer<typeof connectionCreatePayloadSchema>
export type TConnectionResponse = z.infer<typeof connectionResponseSchema>
export type TConnectionParamPayload = z.infer<typeof connectionParamPayloadSchema>
export type TPersonaParamPayload = z.infer<typeof personaParamPayloadSchema>
export type TPersonaUpdatePayload = z.infer<typeof personaUpdatePayloadSchema>
export type TSettingsUpdatePayload = z.infer<typeof settingsUpdatePayloadSchema>
export type TLoginPayload = z.infer<typeof loginPayloadSchema>
