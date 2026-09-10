import { createHash } from 'crypto'
import { serverEnv } from '@/lib/env'
import { normalizeStudentCode } from '@/lib/utils'

export function studentAuthEmail(studentCode: string) {
  const normalized = normalizeStudentCode(studentCode)
  const id = createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 40)
  return `${id}@${serverEnv().studentEmailDomain}`
}
