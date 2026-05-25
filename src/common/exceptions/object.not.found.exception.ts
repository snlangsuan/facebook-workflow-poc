import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class ObjectNotFoundException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'The requested URL path was not found on this object.', statusCode ?? EHttpStatusCode.NOT_FOUND)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
