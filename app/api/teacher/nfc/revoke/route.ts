import { NextResponse } from 'next/server'
import { ensureTeacherClassroom, requireTeacherApi } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const teacher = await requireTeacherApi()
  if ('error' in teacher) return teacher.error
  const { studentId } = await request.json().catch(() => ({ studentId: '' }))
  if (typeof studentId !== 'string' || !studentId) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data: student } = await admin.from('students').select('classroom_id').eq('id', studentId).maybeSingle()
  if (!student) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 404 })
  const auth = await ensureTeacherClassroom(student.classroom_id)
  if ('error' in auth) return auth.error
  const { error } = await admin.from('nfc_tokens').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('student_id', studentId).eq('status', 'active')
  if (error) return NextResponse.json({ error: 'ยกเลิกแท็กไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
