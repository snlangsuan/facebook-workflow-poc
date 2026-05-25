import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

import type { THttpErrorDetailsResponse } from '#/common/types/response.type'

export default class InvalidParameterException extends HttpException {
  constructor(message?: string, statusCode?: number, details?: THttpErrorDetailsResponse[]) {
    super(message ?? 'Invalid parameter.', statusCode ?? EHttpStatusCode.BAD_REQUEST, details)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
