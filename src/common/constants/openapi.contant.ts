import { resolver } from 'hono-openapi'

import { httpErrorResponseSchema } from '#/common/schemas/response.schema'
import { ERouteTag } from '#/common/types/openapi.type'

import type { THttpErrorResponse } from '#/common/types/response.type'
import type { DescribeRouteOptions } from 'hono-openapi'

export const DOC_PAGE_TITLE = 'Peep AI API'
export const DOC_PAGE_DESCRIPTION = `
  Welcome to the Peep AI API Reference. This documentation provides a comprehensive guide to our endpoints, including expense tracking, schedule management, and analytical summaries, helping you build intelligent applications with ease.
`
export const HTTP_ERROR_DESCRIPTIONS: Record<number, string> = {
  200: 'Request successful.',
  201: 'Created successful.',
  400: 'Problem with the request.',
  401: 'Unauthorized.',
  403: 'Insufficient permissions.',
  404: 'Resource not found.',
  409: 'Request conflict.',
  413: 'Content Too Large.',
  415: 'Unsupported Media Type.',
  500: 'Internal server.',
}

export const HTTP_ERROR_EXAMPLE: Record<string, THttpErrorResponse> = {
  '400': {
    error: {
      message: 'The request body has 2 error(s)',
      details: [
        {
          message: 'May not be empty',
          property: 'username',
        },
        {
          message: 'May not be empty',
          property: 'password',
        },
      ],
    },
  },
  '400_1': {
    error: {
      message: 'The query string has 2 error(s)',
      details: [
        {
          message: 'Must be no less than 1',
          property: 'page',
        },
        {
          message: 'Must be no less than 1',
          property: 'limit',
        },
      ],
    },
  },
  '401': {
    error: {
      message: 'Request had invalid authentication credentials.',
    },
  },
  '403': {
    error: {
      message: 'Insufficient permissions to access the resource.',
    },
  },
  '415': {
    error: {
      message: 'The content type, XXX, is not supported',
    },
  },
  '404': {
    error: {
      message: 'The requested URL path was not found on this object.',
    },
  },
  '500': {
    error: {
      message: 'Something went wrong. Please try again.',
    },
  },
}

export const DEFAULT_RESPONSE: DescribeRouteOptions['responses'] = {
  401: {
    description: HTTP_ERROR_DESCRIPTIONS[401] ?? '',
    content: {
      'application/json': {
        schema: resolver(httpErrorResponseSchema.meta({ example: HTTP_ERROR_EXAMPLE['401'] })),
      },
    },
  },
  500: {
    description: HTTP_ERROR_DESCRIPTIONS[500] ?? '',
    content: {
      'application/json': { schema: resolver(httpErrorResponseSchema.meta({ example: HTTP_ERROR_EXAMPLE['500'] })) },
    },
  },
}

export const TAG_DESCRIPTIONS: { name: string; description: string }[] = [
  {
    name: ERouteTag.HEALTH,
    description: "You can read the health information of the API server to see if it's still operational.",
  },
]
