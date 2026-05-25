import { getUtcTime } from '#/common/utils/datetime.util'

import type { Dayjs } from 'dayjs'

export const getUUID = (): string => {
  return crypto.randomUUID()
}

export const getErrorObject = (error: unknown) => {
  if (error instanceof Error) return { message: error.message, stack: error.stack }
  return { message: 'An unknown error occurred.' }
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

export const getExecTime = (start: Dayjs): number => {
  return getUtcTime().diff(start, 'millisecond')
}
