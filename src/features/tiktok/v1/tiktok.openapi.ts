import { describeRoute } from 'hono-openapi'

export const getTiktokConfigSpec = describeRoute({
  tags: ['TikTok'],
  summary: 'Get public TikTok Login Kit configuration',
  responses: {
    200: {
      description: 'TikTok client key, scope and redirect URI',
    },
  },
})

export const tiktokAuthorizeSpec = describeRoute({
  tags: ['TikTok'],
  summary: 'Redirect to the TikTok authorization (consent) screen',
  responses: {
    302: {
      description: 'Redirect to TikTok',
    },
    503: {
      description: 'TikTok Login Kit is not configured',
    },
  },
})

export const tiktokCallbackSpec = describeRoute({
  tags: ['TikTok'],
  summary: 'OAuth callback — exchange code for a token and persist the connection',
  responses: {
    302: {
      description: 'Redirect back to the TikTok page with the login result',
    },
  },
})

export const getTiktokConnectionSpec = describeRoute({
  tags: ['TikTok'],
  summary: 'Get a stored TikTok connection by open id',
  responses: {
    200: {
      description: 'TikTok connection found',
    },
    404: {
      description: 'TikTok connection not found',
    },
  },
})

export const disconnectTiktokSpec = describeRoute({
  tags: ['TikTok'],
  summary: 'Remove a stored TikTok connection',
  responses: {
    200: {
      description: 'TikTok connection removed',
    },
  },
})
