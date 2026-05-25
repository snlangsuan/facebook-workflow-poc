import { Hono } from 'hono'

import { authMiddleware } from '#/core/middlewares/auth.middleware'
import { zValidator } from '#/core/middlewares/validator.middleware'
import { interactionController } from '#/features/interactions/v1/interaction.controller'
import {
  verifyWebhookSpec,
  receiveWebhookSpec,
  sseEventsStreamSpec,
  listConversationsSpec,
  getConversationSpec,
  replyToMessageSpec,
  listPostsSpec,
  getPostSpec,
  replyToCommentSpec,
} from '#/features/interactions/v1/interaction.openapi'
import {
  webhookVerifyQuerySchema,
  conversationParamPayloadSchema,
  messageReplyPayloadSchema,
  postParamPayloadSchema,
  commentReplyPayloadSchema,
} from '#/features/interactions/v1/interaction.schema'

export const interactionsRouter = new Hono()

interactionsRouter.get(
  '/webhook',
  verifyWebhookSpec,
  zValidator('query', webhookVerifyQuerySchema),
  interactionController.verifyWebhook,
)

interactionsRouter.post('/webhook', receiveWebhookSpec, interactionController.receiveWebhook)

interactionsRouter.get('/events', sseEventsStreamSpec, authMiddleware(), interactionController.sseEventsStream)

interactionsRouter.get(
  '/conversations',
  listConversationsSpec,
  authMiddleware(),
  interactionController.listConversations,
)

interactionsRouter.get(
  '/conversations/:id',
  getConversationSpec,
  authMiddleware(),
  zValidator('param', conversationParamPayloadSchema),
  interactionController.getConversation,
)

interactionsRouter.post(
  '/messages/reply',
  replyToMessageSpec,
  authMiddleware(),
  zValidator('json', messageReplyPayloadSchema),
  interactionController.replyToMessage,
)

interactionsRouter.get('/posts', listPostsSpec, authMiddleware(), interactionController.listPosts)

interactionsRouter.get(
  '/posts/:id',
  getPostSpec,
  authMiddleware(),
  zValidator('param', postParamPayloadSchema),
  interactionController.getPost,
)

interactionsRouter.post(
  '/comments/reply',
  replyToCommentSpec,
  authMiddleware(),
  zValidator('json', commentReplyPayloadSchema),
  interactionController.replyToComment,
)
