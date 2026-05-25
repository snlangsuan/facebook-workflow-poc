import { EHttpStatusCode } from '#/common/types/response.type'

import type { THttpErrorDetailsResponse, THttpErrorResponse } from '#/common/types/response.type'

type THttpStatusCode = (typeof EHttpStatusCode)[keyof typeof EHttpStatusCode]

export abstract class HttpException extends Error {
  private _statusCode: THttpStatusCode = EHttpStatusCode.INTERNAL_ERROR
  private _details: THttpErrorDetailsResponse[] | undefined

  constructor(message: string, statusCode: THttpStatusCode, details?: THttpErrorDetailsResponse[]) {
    super(message)
    this._statusCode = statusCode
    this._details = details
  }

  get statusCode(): THttpStatusCode {
    return this._statusCode
  }

  get details(): THttpErrorDetailsResponse[] | undefined {
    return this._details
  }

  toJson(): THttpErrorResponse {
    const obj = { error: { message: this.message } } as THttpErrorResponse
    if (Array.isArray(this._details) && this._details.length > 0) obj.error.details = this._details
    return obj
  }
}
