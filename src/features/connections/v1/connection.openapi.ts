import { describeRoute } from 'hono-openapi'

export const getConnectionSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Get user connection details',
  responses: {
    200: {
      description: 'Connection found',
    },
    404: {
      description: 'Connection not found',
    },
  },
})

export const saveConnectionSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Save/create page connection',
  responses: {
    200: {
      description: 'Connection successfully saved',
    },
  },
})

export const deleteConnectionSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Delete connection',
  responses: {
    200: {
      description: 'Connection deleted successfully',
    },
  },
})

export const getAvailablePagesSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Get list of mock available pages to connect',
  responses: {
    200: {
      description: 'List of pages',
    },
  },
})

export const setPersonaSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Set the AI persona (system instruction) for a connected page',
  responses: {
    200: {
      description: 'Persona updated successfully',
    },
  },
})

export const setSettingsSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Toggle AI auto-reply for inbox/comments on a page',
  responses: {
    200: {
      description: 'Settings updated successfully',
    },
  },
})

export const getConfigSpec = describeRoute({
  tags: ['Connections'],
  summary: 'Get public configuration parameters',
  responses: {
    200: {
      description: 'Configuration parameters',
    },
  },
})

export const loginSpec = describeRoute({
  tags: ['Auth'],
  summary: 'Verify user credentials with Firebase Auth',
  responses: {
    200: {
      description: 'Login successful',
    },
    401: {
      description: 'Invalid credentials',
    },
  },
})
