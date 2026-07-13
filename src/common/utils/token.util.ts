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
