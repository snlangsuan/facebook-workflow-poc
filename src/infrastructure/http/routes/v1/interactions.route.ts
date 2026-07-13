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
  importInboxSpec,
  clearConversationsSpec,
  syncProfileSpec,
  replyToMessageSpec,
  listPostsSpec,
  getPostSpec,
  replyToCommentSpec,
  importPostSpec,
  deletePostSpec,
  syncPostSpec,
  hideCommentSpec,
  likeCommentSpec,
  deleteCommentSpec,
} from '#/features/interactions/v1/interaction.openapi'
import {
  webhookVerifyQuerySchema,
  conversationParamPayloadSchema,
  messageReplyPayloadSchema,
  postParamPayloadSchema,
  commentReplyPayloadSchema,
  importPostPayloadSchema,
  importInboxPayloadSchema,
  hideCommentPayloadSchema,
  likeCommentPayloadSchema,
  deleteCommentPayloadSchema,
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

interactionsRouter.delete(
  '/conversations',
  clearConversationsSpec,
  authMiddleware(),
  interactionController.clearConversations,
)

interactionsRouter.post(
  '/conversations/import-from-page',
  importInboxSpec,
  authMiddleware(),
  zValidator('json', importInboxPayloadSchema),
  interactionController.importInbox,
)

interactionsRouter.post(
  '/conversations/:id/sync-profile',
  syncProfileSpec,
  authMiddleware(),
  zValidator('param', conversationParamPayloadSchema),
  interactionController.syncProfile,
)

interactionsRouter.post(
  '/messages/reply',
  replyToMessageSpec,
  authMiddleware(),
  zValidator('json', messageReplyPayloadSchema),
  interactionController.replyToMessage,
)

interactionsRouter.get('/posts', listPostsSpec, authMiddleware(), interactionController.listPosts)

interactionsRouter.post(
  '/posts/import',
  importPostSpec,
  authMiddleware(),
  zValidator('json', importPostPayloadSchema),
  interactionController.importPost,
)

interactionsRouter.get(
  '/posts/:id',
  getPostSpec,
  authMiddleware(),
  zValidator('param', postParamPayloadSchema),
  interactionController.getPost,
)

interactionsRouter.delete(
  '/posts/:id',
  deletePostSpec,
  authMiddleware(),
  zValidator('param', postParamPayloadSchema),
  interactionController.deletePost,
)

interactionsRouter.post(
  '/posts/:id/sync',
  syncPostSpec,
  authMiddleware(),
  zValidator('param', postParamPayloadSchema),
  interactionController.syncPost,
)

interactionsRouter.post(
  '/comments/reply',
  replyToCommentSpec,
  authMiddleware(),
  zValidator('json', commentReplyPayloadSchema),
  interactionController.replyToComment,
)

interactionsRouter.post(
  '/comments/hide',
  hideCommentSpec,
  authMiddleware(),
  zValidator('json', hideCommentPayloadSchema),
  interactionController.hideComment,
)

interactionsRouter.post(
  '/comments/like',
  likeCommentSpec,
  authMiddleware(),
  zValidator('json', likeCommentPayloadSchema),
  interactionController.likeComment,
)

interactionsRouter.post(
  '/comments/delete',
  deleteCommentSpec,
  authMiddleware(),
  zValidator('json', deleteCommentPayloadSchema),
  interactionController.deleteComment,
)
