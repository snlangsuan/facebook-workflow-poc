import { HttpException } from '#/common/exceptions/http.exception'
import { EHttpStatusCode } from '#/common/types/response.type'

export default class InsufficientPermissionException extends HttpException {
  constructor(message?: string, statusCode?: number) {
    super(message ?? 'Insufficient permissions to access the resource.', statusCode ?? EHttpStatusCode.FORBIDDEN)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
