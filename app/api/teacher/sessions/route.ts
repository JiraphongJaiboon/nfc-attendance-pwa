import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { isIsoDate, isTime } from '@/lib/validation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { localBangkokIso } from '@/lib/utils'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const classroomId = params.get('classroomId') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  if (!isIsoDate(from) || !isIsoDate(to)) return NextResponse.json({ error: 'ช่วงวันที่ไม่ถูกต้อง' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('attendance_sessions').select('*').eq('classroom_id', classroomId).gte('session_date', from).lte('session_date', to).order('session_date')
  if (error) return NextResponse.json({ error: 'โหลดรอบเช็กชื่อไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const classroomId = String(body.classroomId ?? '')
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  const date = String(body.date ?? '')
  const openTime = String(body.openTime ?? '')
  const onTimeUntil = String(body.onTimeUntil ?? '')
  const closeTime = String(body.closeTime ?? '')
  if (!isIsoDate(date) || !isTime(openTime) || !isTime(onTimeUntil) || !isTime(closeTime)) {
    return NextResponse.json({ error: 'วันที่หรือเวลาไม่ถูกต้อง' }, { status: 400 })
  }
  if (!(openTime <= onTimeUntil && onTimeUntil <= closeTime)) {
    return NextResponse.json({ error: 'เวลาต้องเรียง เปิดรับ ≤ ตรงเวลาถึง ≤ ปิดรับ' }, { status: 400 })
  }
  const admin = createAdminSupabase()
  const { data: classroom } = await admin.from('classrooms').select('is_active').eq('id', classroomId).single()
  if (!classroom?.is_active) return NextResponse.json({ error: 'ห้องเรียนถูกปิดใช้งาน ไม่สามารถสร้างรอบใหม่ได้' }, { status: 409 })
  const { data, error } = await admin.from('attendance_sessions').insert({
    classroom_id: classroomId,
    teacher_id: auth.user.id,
    session_date: date,
    open_at: localBangkokIso(date, openTime),
    on_time_until: localBangkokIso(date, onTimeUntil),
    close_at: localBangkokIso(date, closeTime),
    allow_late: Boolean(body.allowLate),
    is_open: body.isOpen !== false,
    closed_at: body.isOpen === false ? new Date().toISOString() : null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'ห้องนี้มีรอบเช็กชื่อในวันที่เลือกแล้ว' : `สร้างรอบไม่สำเร็จ: ${error.message}` }, { status: error.code === '23505' ? 409 : 500 })
  return NextResponse.json({ session: data }, { status: 201 })
}
