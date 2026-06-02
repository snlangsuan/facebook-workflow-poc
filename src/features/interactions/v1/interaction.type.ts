import { z } from 'zod'

import {
  webhookVerifyQuerySchema,
  messageReplyPayloadSchema,
  commentReplyPayloadSchema,
  hideCommentPayloadSchema,
  customerMessagePayloadSchema,
  customerCommentPayloadSchema,
  customerPostPayloadSchema,
  importPostPayloadSchema,
  conversationParamPayloadSchema,
  postParamPayloadSchema,
} from '#/features/interactions/v1/interaction.schema'

export type TWebhookVerifyQuery = z.infer<typeof webhookVerifyQuerySchema>
export type TMessageReplyPayload = z.infer<typeof messageReplyPayloadSchema>
export type TCommentReplyPayload = z.infer<typeof commentReplyPayloadSchema>
export type THideCommentPayload = z.infer<typeof hideCommentPayloadSchema>
export type TCustomerMessagePayload = z.infer<typeof customerMessagePayloadSchema>
export type TCustomerCommentPayload = z.infer<typeof customerCommentPayloadSchema>
export type TCustomerPostPayload = z.infer<typeof customerPostPayloadSchema>
export type TImportPostPayload = z.infer<typeof importPostPayloadSchema>
export type TConversationParamPayload = z.infer<typeof conversationParamPayloadSchema>
export type TPostParamPayload = z.infer<typeof postParamPayloadSchema>
