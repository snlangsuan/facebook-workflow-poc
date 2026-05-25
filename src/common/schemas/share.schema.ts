import { z } from 'zod'

export const successResponseSchema = z.object({
  success: z.boolean().default(true),
})

export type TSuccessResponse = z.infer<typeof successResponseSchema>

export const dateTimeType = z.string().datetime()
