import { z } from 'zod'

import { envSchema } from '#/common/schemas/env.schema'

export type AppEnvVariables = z.infer<typeof envSchema>
