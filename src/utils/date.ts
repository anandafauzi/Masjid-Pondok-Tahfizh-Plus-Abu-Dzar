import { formatInTimeZone } from 'date-fns-tz'
import { id } from 'date-fns/locale'

const TIMEZONE = 'Asia/Jakarta'

export function getCurrentTime() {
  return formatInTimeZone(new Date(), TIMEZONE, 'HH:mm:ss')
}

export function getCurrentDate() {
  return formatInTimeZone(new Date(), TIMEZONE, 'EEEE, dd MMMM yyyy', { locale: id })
}

export function formatTime(time: string) {
  return time
}

export function isFriday(date: Date = new Date()) {
  return date.getDay() === 5 // Friday is 5
}
