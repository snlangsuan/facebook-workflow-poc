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

export const hideCommentSpec = describeRoute({
  tags: ['Interactions'],
  summary: 'Hide or unhide a comment (is_hidden)',
  responses: {
    200: { description: 'Comment visibility updated' },
    404: { description: 'Comment not found' },
  },
})

export const likeCommentSpec = describeRoute({
  tags: ['Interactions'],
  summary: 'Like or unlike a comment as the Page (pages_manage_engagement)',
  responses: {
    200: { description: 'Comment like updated' },
    404: { description: 'Comment not found' },
  },
})

export const deleteCommentSpec = describeRoute({
  tags: ['Interactions'],
  summary: 'Delete a comment on a Page post (pages_manage_engagement)',
  responses: {
    200: { description: 'Comment deleted' },
    404: { description: 'Comment not found' },
  },
})

export const syncPostSpec = describeRoute({
  tags: ['Interactions'],
  summary: "Re-sync a post's comments and replies from Facebook",
  responses: {
    200: { description: 'Post synced' },
    404: { description: 'Post not found' },
  },
})

export const deletePostSpec = describeRoute({
  tags: ['Interactions'],
  summary: 'Delete a post (and its comments) from the dashboard',
  responses: {
    200: { description: 'Post deleted' },
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
  summary: "List conversations for the signed-in user's connected Pages",
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

export const importInboxSpec = describeRoute({
  tags: ['Conversations'],
  summary: 'Import existing Messenger threads for the Page from the Graph API (no webhook needed)',
  responses: {
    200: {
      description: 'Conversations imported',
    },
  },
})

export const clearConversationsSpec = describeRoute({
  tags: ['Conversations'],
  summary: 'Clear inbox conversations (optionally scoped to a pageId)',
  responses: {
    200: {
      description: 'Conversations cleared',
    },
  },
})

export const syncProfileSpec = describeRoute({
  tags: ['Conversations'],
  summary: "Re-fetch a customer's profile via Business Asset User Profile Access",
  responses: {
    200: {
      description:
        'Profile sync attempted. `profileFetched` reports success; `pendingApproval` is true when Graph refused because Business Asset User Profile Access is not granted yet.',
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
  summary: "List feed posts for the signed-in user's connected Pages",
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
