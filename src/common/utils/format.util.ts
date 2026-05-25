import type { THttpErrorDetailsResponse } from '#/common/types/response.type'
import type { ZodError } from 'zod'

export const parseValidateErrorDetails = (issues: ZodError['issues']): THttpErrorDetailsResponse[] => {
  const details: THttpErrorDetailsResponse[] = issues.map((err) => ({
    property: err.path.join('.'),
    message: err.message,
  }))
  return details
}
