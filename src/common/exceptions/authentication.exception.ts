import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class AuthenticationException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'Request had invalid authentication credentials.', statusCode ?? EHttpStatusCode.UNAUTHORIZED)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
