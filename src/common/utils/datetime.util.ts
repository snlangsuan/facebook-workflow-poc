import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

export function getUtcTime(date?: string | number): dayjs.Dayjs {
  return date ? dayjs.utc(date) : dayjs.utc()
}

export function getLocalTime(date?: string | number, tz: string = 'Asia/Bangkok'): dayjs.Dayjs {
  return date ? dayjs.utc(date).tz(tz) : dayjs().tz(tz)
}

export function formatDateTime(date: string | number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs.utc(date).format(format)
}

export function formatToIso(date?: string | number): string {
  return date ? dayjs.utc(date).toISOString() : dayjs.utc().toISOString()
}
