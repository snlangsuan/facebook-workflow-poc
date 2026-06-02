import { describeRoute } from 'hono-openapi'

export const verifyWebhookSpec = describeRoute({
  tags: ['Webhook'],
  summary: 'Verify Facebook webhook subscription',
  responses: {
    200: {
      description: 'Webhook successfully verified',
    },
  },
})

export const importPostSpec = describeRoute({
  tags: ['Interactions'],
  summary: 'Import a Facebook post (and its comments) by URL or id',
  responses: {
    200: { description: 'Post imported' },
    400: { description: 'Invalid URL or fetch failed' },
  },
})

export const receiveWebhookSpec = describeRoute({
  tags: ['Webhook'],
  summary: 'Receive Facebook webhook notifications',
  responses: {
    200: {
      description: 'Webhook processed successfully',
    },
  },
})

export const sseEventsStreamSpec = describeRoute({
  tags: ['Realtime'],
  summary: 'Subscribe to Server-Sent Events stream',
  responses: {
    200: {
      description: 'SSE stream established',
    },
  },
})

export const listConversationsSpec = describeRoute({
  tags: ['Conversations'],
  summary: 'List all chat conversations',
  responses: {
    200: {
      description: 'List of conversations retrieved',
    },
  },
})

export const getConversationSpec = describeRoute({
  tags: ['Conversations'],
  summary: 'Get individual conversation details',
  responses: {
    200: {
      description: 'Conversation found',
    },
    404: {
      description: 'Conversation not found',
    },
  },
})

export const replyToMessageSpec = describeRoute({
  tags: ['Conversations'],
  summary: 'Send reply message back to user',
  responses: {
    200: {
      description: 'Reply sent successfully',
    },
  },
})

export const listPostsSpec = describeRoute({
  tags: ['Posts'],
  summary: 'List all page posts',
  responses: {
    200: {
      description: 'List of posts retrieved',
    },
  },
})

export const getPostSpec = describeRoute({
  tags: ['Posts'],
  summary: 'Get individual post details and comments',
  responses: {
    200: {
      description: 'Post found',
    },
    404: {
      description: 'Post not found',
    },
  },
})

export const replyToCommentSpec = describeRoute({
  tags: ['Posts'],
  summary: 'Send reply comment back to post',
  responses: {
    200: {
      description: 'Reply comment sent successfully',
    },
  },
})
