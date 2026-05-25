import { z } from 'zod'

export const httpErrorDetailsResponseSchema = z.object({
  property: z.string(),
  message: z.string(),
})

export const httpErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.array(httpErrorDetailsResponseSchema).optional(),
  }),
})

export const emptyResponseSchema = z.object({})

export const successResponseSchema = z
  .object({
    success: z.boolean().default(true),
  })
  .meta({ examples: [{ success: true }] })

export const paginationMetadataSchema = z
  .object({
    total: z.number(),
    count: z.number(),
    page: z.number(),
    limit: z.number(),
  })
  .meta({
    examples: [
      {
        total: 100,
        count: 25,
        page: 1,
        limit: 25,
      },
    ],
  })

export const binaryResponseSchema = z.string().meta({
  type: 'string',
  format: 'binary',
  description: 'A binary file',
})
