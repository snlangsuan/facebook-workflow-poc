import { z } from 'zod'

import {
  webhookVerifyQuerySchema,
  messageReplyPayloadSchema,
  commentReplyPayloadSchema,
  hideCommentPayloadSchema,
  likeCommentPayloadSchema,
  deleteCommentPayloadSchema,
  customerMessagePayloadSchema,
  customerCommentPayloadSchema,
  customerPostPayloadSchema,
  importPostPayloadSchema,
  importInboxPayloadSchema,
  conversationParamPayloadSchema,
  postParamPayloadSchema,
} from '#/features/interactions/v1/interaction.schema'

export type TWebhookVerifyQuery = z.infer<typeof webhookVerifyQuerySchema>
export type TMessageReplyPayload = z.infer<typeof messageReplyPayloadSchema>
export type TCommentReplyPayload = z.infer<typeof commentReplyPayloadSchema>
export type THideCommentPayload = z.infer<typeof hideCommentPayloadSchema>
export type TLikeCommentPayload = z.infer<typeof likeCommentPayloadSchema>
export type TDeleteCommentPayload = z.infer<typeof deleteCommentPayloadSchema>
export type TCustomerMessagePayload = z.infer<typeof customerMessagePayloadSchema>
export type TCustomerCommentPayload = z.infer<typeof customerCommentPayloadSchema>
export type TCustomerPostPayload = z.infer<typeof customerPostPayloadSchema>
export type TImportPostPayload = z.infer<typeof importPostPayloadSchema>
export type TImportInboxPayload = z.infer<typeof importInboxPayloadSchema>
export type TConversationParamPayload = z.infer<typeof conversationParamPayloadSchema>
export type TPostParamPayload = z.infer<typeof postParamPayloadSchema>
