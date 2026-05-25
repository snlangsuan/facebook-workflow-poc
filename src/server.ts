import { serve } from '@hono/node-server'

import app from '#/app'
import { logger } from '#/common/libs/logger.lib'
import { startQueueWorker, startScheduleWorker, stopAllWorkers } from '#/worker'

const port = Number(process.env.PORT) || 8000
const host = process.env.HOST || 'localhost'
const isLocal = process.env.NODE_ENV === 'local'

const certFile = Bun.file('./.credentials/localhost.pem')
const keyFile = Bun.file('./.credentials/localhost-key.pem')

const options =
  isLocal && (await certFile.exists()) && (await keyFile.exists())
    ? {
        serverOptions: {
          key: await keyFile.text(),
          cert: await certFile.text(),
        },
      }
    : {}

const server = serve({
  fetch: app.fetch,
  hostname: host,
  port: port,
  ...options,
})

// Initialize Background Workers (Queue Handler & Schedule Task Runner)
startQueueWorker()
startScheduleWorker()

const protocol = isLocal && options.serverOptions ? 'https' : 'http'

logger.info(`🚀 Omni Intelligence Backend is running at ${protocol}://${host}:${port}`)
logger.info(`📅 Environment: ${process.env.NODE_ENV || 'local'}`)
logger.info(`🔌 Port: ${port}`)
if (isLocal && !options.serverOptions) {
  logger.warn('⚠️  HTTPS is not active for local environment (certificate files missing)')
  logger.warn('💡 Run "mkcert localhost" to generate certificates')
}

process.on('SIGINT', () => {
  logger.info('Shutting down server...')
  stopAllWorkers()
  server.close()
  process.exit(0)
})
