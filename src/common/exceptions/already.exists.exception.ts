import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class AlreadyExistsException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'Object already exists.', statusCode ?? EHttpStatusCode.CONFLICT)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
