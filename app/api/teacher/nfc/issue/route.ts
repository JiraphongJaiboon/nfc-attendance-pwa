import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { requireTeacherApi, ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'

export async function POST(request: Request) {
  const teacher = await requireTeacherApi()
  if ('error' in teacher) return teacher.error
  const { studentId } = await request.json().catch(() => ({ studentId: '' }))
  if (typeof studentId !== 'string' || !studentId) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: student } = await admin.from('students').select('id,classroom_id,active').eq('id', studentId).maybeSingle()
  if (!student) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 404 })
  const access = await ensureTeacherClassroom(student.classroom_id)
  if ('error' in access) return access.error
  if (!student.active) return NextResponse.json({ error: 'นักเรียนถูกระงับ ไม่สามารถออกแท็กใหม่ได้' }, { status: 409 })

  const now = new Date().toISOString()
  const { error: revokeError } = await admin.from('nfc_tokens').update({ status: 'revoked', revoked_at: now }).eq('student_id', studentId).eq('status', 'active')
  if (revokeError) return NextResponse.json({ error: 'ยกเลิกแท็กเดิมไม่สำเร็จ' }, { status: 500 })

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { error } = await admin.from('nfc_tokens').insert({ student_id: studentId, token_hash: tokenHash, status: 'active' })
  if (error) return NextResponse.json({ error: 'สร้าง NFC Token ไม่สำเร็จ' }, { status: 500 })
  const url = `${serverEnv().siteUrl}/nfc/${token}`
  return NextResponse.json({ url, message: 'สร้างลิงก์ใหม่แล้ว ลิงก์เดิมถูกยกเลิกทันที ระบบจะไม่เก็บ Token จริงไว้ในฐานข้อมูล' })
}
