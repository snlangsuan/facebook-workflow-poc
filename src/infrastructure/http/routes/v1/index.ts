import { Hono } from 'hono'

import { connectionsRouter } from '#/infrastructure/http/routes/v1/connections.route'
import { interactionsRouter } from '#/infrastructure/http/routes/v1/interactions.route'

export const v1Router = new Hono()

v1Router.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

v1Router.route('/connections', connectionsRouter)
v1Router.route('/interactions', interactionsRouter)
