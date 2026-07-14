import { logger } from '#/common/libs/logger.lib'
import { envVariables } from '#/factory'

/**
 * Masked, safe-for-any-environment preview of a token: shows length and a few edge chars
 * so you can tell whether a token is present / which one it is, without leaking the secret.
 */
export function maskToken(token?: string): string {
  if (!token) {
    return '<none>'
  }
  if (token.length <= 12) {
    return `…(len ${token.length})`
  }
  return `${token.slice(0, 8)}…${token.slice(-4)} (len ${token.length})`
}

/**
 * Token value for debug logs. Outside production the FULL token is returned (handy for
 * pasting into the Graph API Explorer while debugging); in production it is masked so it
 * never leaks into deployed logs.
 */
export function tokenForLog(token?: string): string {
  if (!token) {
    return '<none>'
  }
  return envVariables.NODE_ENV === 'production' ? maskToken(token) : token
}

/**
 * Emit a token debug log — but ONLY when DEBUG_TOKEN=true. Off by default so access tokens
 * are never written to the logs during normal operation. Flip DEBUG_TOKEN in .env to re-enable.
 */
export function logToken(bindings: Record<string, unknown>, msg: string): void {
  if (!envVariables.DEBUG_TOKEN) {
    return
  }
  logger.debug(bindings, msg)
}
