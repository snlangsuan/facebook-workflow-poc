import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { logger } from '#/common/libs/logger.lib'
import { v1Router } from '#/infrastructure/http/routes/v1/index'

const app = new Hono()

app.use('*', cors())

app.route('/api/v1', v1Router)

app.use('/*', serveStatic({ root: './src/public' }))

app.onError((err, c) => {
  logger.error(err, 'Server error occurred')
  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
    },
    500,
  )
})

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
    },
    404,
  )
})

export default app
