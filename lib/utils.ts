export const BANGKOK_TZ = 'Asia/Bangkok'

export function normalizeStudentCode(value: string) {
  return value.trim()
}

export function validatePin(pin: string) {
  return /^\d{6,}$/.test(pin)
}

export function thaiDate(dateString: string, withWeekday = true) {
  const date = new Date(`${dateString}T00:00:00+07:00`)
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function thaiDateTime(iso: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(iso))
}

export function thaiTime(iso: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: BANGKOK_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

export function bangkokDateNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export function localBangkokIso(date: string, time: string) {
  return `${date}T${time}:00+07:00`
}

export function enumerateDates(from: string, to: string) {
  const result: string[] = []
  const cursor = new Date(`${from}T00:00:00+07:00`)
  const end = new Date(`${to}T00:00:00+07:00`)
  while (cursor <= end && result.length < 93) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    result.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

export function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/teacher'
  return value
}
