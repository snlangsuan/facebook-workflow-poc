import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class ApplicationException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'Something went wrong. Please try again.', statusCode ?? EHttpStatusCode.INTERNAL_ERROR)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
