import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class LimitReachedException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'Limit reached.', statusCode ?? EHttpStatusCode.BAD_REQUEST)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
