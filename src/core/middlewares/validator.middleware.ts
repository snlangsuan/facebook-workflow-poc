import { sValidator as honoValidator } from '@hono/standard-validator'

import type { Context, MiddlewareHandler } from 'hono'
import type { z } from 'zod'

interface ValidationResult {
  readonly success: boolean
  readonly data?: unknown
  readonly error?: readonly unknown[]
}

export function zValidator<S extends z.ZodType>(
  target: 'json' | 'query' | 'param' | 'form' | 'header' | 'cookie',
  schema: S,
): MiddlewareHandler {
  return honoValidator(target, schema, (result: ValidationResult, c: Context) => {
    if (!result.success && result.error) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          issues: result.error,
        },
        400,
      )
    }
  }) as unknown as MiddlewareHandler
}
