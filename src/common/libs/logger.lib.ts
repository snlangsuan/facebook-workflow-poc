import { pino } from 'pino'
import { pinoHttp } from 'pino-http'

import { envVariables } from '#/factory'

import type { Options as PinoOptions } from 'pino-http'
const options: PinoOptions = {
  logger: pino({
    level: 'debug',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.headers.cookie',
        'req.body.refresh_token',
        'req.headers.x-api-key',
      ],
      censor: '***',
    },
    transport:
      envVariables.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      req(req: unknown) {
        const r = req as { url: string; body?: unknown; raw: { body?: unknown } }
        if (r.url) {
          r.url = r.url.replace(/access_token=[^&]+/, 'access_token=***')
        }
        r.body = r.raw?.body
        return r
      },
    },
  }),
  useLevel: 'debug',
}

export const httpLogger = pinoHttp(options)
export const logger = httpLogger.logger
export const pinoMiddleware = httpLogger
export type AppLogger = typeof logger
