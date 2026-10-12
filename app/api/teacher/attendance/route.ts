import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

const TIME_RE = /^(?:[01]\\d|2[0-3]):[0-5]\\d$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const status = body.status === 'present' || body.status === 'late' || body.status === 'missing' ? body.status : ''
  const time = typeof body.time === 'string' ? body.time.trim() : ''

  if (!sessionId || !studentId || !status) {
    return NextResponse.json({ error: 'ข้อมูลสำหรับแก้ไขการเช็กชื่อไม่ครบ' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data: session, error: sessionError } = await admin
    .from('attendance_sessions')
    .select('id, classroom_id, session_date')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) return NextResponse.json({ error: 'ไม่พบรอบเช็กชื่อ' }, { status: 404 })

  const auth = await ensureTeacherClassroom(session.classroom_id)
  if ('error' in auth) return auth.error

  const { data: student, error: studentError } = await admin
    .from('students')
    .select('id, classroom_id, active')
    .eq('id', studentId)
    .maybeSingle()

  if (studentError || !student) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 404 })
  if (student.classroom_id !== session.classroom_id) {
    return NextResponse.json({ error: 'นักเรียนไม่ได้อยู่ในห้องของรอบเช็กชื่อนี้' }, { status: 409 })
  }

  if (status === 'missing') {
    const { error } = await admin.from('attendance').delete().eq('session_id', sessionId).eq('student_id', studentId)
    if (error) return NextResponse.json({ error: 'ลบรายการเช็กชื่อไม่สำเร็จ' }, { status: 500 })
    return NextResponse.json({ ok: true, attendance: null })
  }

  if (!student.active) return NextResponse.json({ error: 'นักเรียนถูกระงับ' }, { status: 409 })
  if (!TIME_RE.test(time)) return NextResponse.json({ error: 'กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 08:05' }, { status: 400 })

  const checkedAt = new Date(`${session.session_date}T${time}:00+07:00`)
  if (Number.isNaN(checkedAt.getTime())) return NextResponse.json({ error: 'เวลาเช็กชื่อไม่ถูกต้อง' }, { status: 400 })

  const { data: attendance, error } = await admin
    .from('attendance')
    .upsert({
      classroom_id: session.classroom_id,
      session_id: sessionId,
      student_id: studentId,
      status,
      source: 'nfc',
      checked_at: checkedAt.toISOString(),
    }, { onConflict: 'session_id,student_id' })
    .select('*')
    .single()

  if (error) {
    console.error('EDIT ATTENDANCE ERROR:', error)
    return NextResponse.json({ error: `แก้ไขการเช็กชื่อไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, attendance })
}
