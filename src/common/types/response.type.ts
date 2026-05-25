import { z } from 'zod'

import type {
  emptyResponseSchema,
  httpErrorDetailsResponseSchema,
  httpErrorResponseSchema,
  paginationMetadataSchema,
  successResponseSchema,
} from '#/common/schemas/response.schema'

export enum EHttpStatusCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_ERROR = 500,
}

export type TEmptyResponse = z.infer<typeof emptyResponseSchema>
export type THttpErrorDetailsResponse = z.infer<typeof httpErrorDetailsResponseSchema>
export type THttpErrorResponse = z.infer<typeof httpErrorResponseSchema>
export type TSuccessResponse = z.infer<typeof successResponseSchema>

export type THttpPaginationMetadata = z.infer<typeof paginationMetadataSchema>
