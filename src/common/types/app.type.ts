import type { AppLogger } from '#/common/libs/logger.lib'
import type { AppEnvVariables } from '#/common/types/env.type'
import type { HttpBindings } from '@hono/node-server'
import type { RequestIdVariables } from 'hono/request-id'
import type { Bindings as HonoBindings } from 'hono/types'

export type Bindings = HonoBindings & HttpBindings
export type Variables = RequestIdVariables &
  AppEnvVariables & {
    logger: AppLogger
    user_id: string
    workspace_id: string | null
  }

export type JsonInputSchema<T> = {
  in: {
    json: T
  }
  out: {
    json: T
  }
}

export type ParamInputSchema<T> = {
  in: {
    param: T
  }
  out: {
    param: T
  }
}

export type QueryInputSchema<T> = {
  in: {
    query: T
  }
  out: {
    query: T
  }
}

export type FormInputSchema<T> = {
  in: {
    form: T
  }
  out: {
    form: T
  }
}
