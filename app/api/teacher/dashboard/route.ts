import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { isIsoDate } from '@/lib/validation'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const classroomId = params.get('classroomId') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) return NextResponse.json({ error: 'ช่วงวันที่ไม่ถูกต้อง' }, { status: 400 })
  const days = Math.ceil((Date.parse(`${to}T00:00:00+07:00`) - Date.parse(`${from}T00:00:00+07:00`)) / 86400000) + 1
  if (days > 93) return NextResponse.json({ error: 'ดูข้อมูลได้ครั้งละไม่เกิน 93 วัน' }, { status: 400 })

  const admin = createAdminSupabase()
  const [{ data: classroom, error: roomError }, { data: students, error: studentError }, { data: sessions, error: sessionError }] = await Promise.all([
    admin.from('classrooms').select('*').eq('id', classroomId).single(),
    admin.from('students').select('*').eq('classroom_id', classroomId).order('number'),
    admin.from('attendance_sessions').select('*').eq('classroom_id', classroomId).gte('session_date', from).lte('session_date', to).order('session_date'),
  ])
  if (roomError || studentError || sessionError || !classroom) return NextResponse.json({ error: 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ' }, { status: 500 })

  const sessionIds = (sessions ?? []).map((s) => s.id)
  let attendance: unknown[] = []
  if (sessionIds.length) {
    const { data, error } = await admin.from('attendance').select('*').eq('classroom_id', classroomId).in('session_id', sessionIds).order('checked_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'โหลดข้อมูลเช็กชื่อไม่สำเร็จ' }, { status: 500 })
    attendance = data ?? []
  }
  return NextResponse.json({ classroom, students: students ?? [], sessions: sessions ?? [], attendance, from, to, serverNow: new Date().toISOString() })
}
