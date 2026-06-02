import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { logger } from '#/common/libs/logger.lib'
import { v1Router } from '#/infrastructure/http/routes/v1/index'

const app = new Hono()

// Log every incoming request (method, path, status) — lets us see if Facebook's
// webhook is even reaching the server, and on which path. Skips noisy static assets.
app.use('*', async (c, next) => {
  await next()
  const path = c.req.path
  if (!/\.(html|js|css|svg|png|ico|map)$/.test(path)) {
    logger.info({ method: c.req.method, path, status: c.res.status }, '➡️  HTTP request')
  }
})

app.use('*', cors())

// The whole app (API + static frontend) is served under the /demo prefix.
app.get('/', (c) => c.redirect('/demo/'))
app.get('/demo', (c) => c.redirect('/demo/'))

app.route('/demo/api/v1', v1Router)

app.use(
  '/demo/*',
  serveStatic({
    root: './src/public',
    rewriteRequestPath: (path) => path.replace(/^\/demo/, '') || '/',
  }),
)

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
