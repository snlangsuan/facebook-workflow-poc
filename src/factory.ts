import { envSchema } from '#/common/schemas/env.schema'

export const envVariables = envSchema.parse(process.env)
