import { NextResponse } from 'next/server'
import { requireTeacherApi, ensureTeacherClassroom } from '@/lib/auth'
import { isTime } from '@/lib/validation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { localBangkokIso } from '@/lib/utils'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await requireTeacherApi()
  if ('error' in teacher) return teacher.error
  const admin = createAdminSupabase()
  const { data: session } = await admin.from('attendance_sessions').select('*').eq('id', id).maybeSingle()
  if (!session) return NextResponse.json({ error: 'ไม่พบรอบเช็กชื่อ หรือไม่มีสิทธิ์' }, { status: 404 })
  const access = await ensureTeacherClassroom(session.classroom_id)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  const openTime = body.openTime == null ? null : String(body.openTime)
  const onTimeUntil = body.onTimeUntil == null ? null : String(body.onTimeUntil)
  const closeTime = body.closeTime == null ? null : String(body.closeTime)
  if (openTime !== null && !isTime(openTime)) return NextResponse.json({ error: 'เวลาเปิดรับไม่ถูกต้อง' }, { status: 400 })
  if (onTimeUntil !== null && !isTime(onTimeUntil)) return NextResponse.json({ error: 'เวลาสิ้นสุดตรงเวลาไม่ถูกต้อง' }, { status: 400 })
  if (closeTime !== null && !isTime(closeTime)) return NextResponse.json({ error: 'เวลาปิดรับไม่ถูกต้อง' }, { status: 400 })
  const currentTime = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  const o = openTime ?? currentTime(session.open_at)
  const t = onTimeUntil ?? currentTime(session.on_time_until)
  const c = closeTime ?? currentTime(session.close_at)
  if (!(o <= t && t <= c)) return NextResponse.json({ error: 'เวลาต้องเรียง เปิดรับ ≤ ตรงเวลาถึง ≤ ปิดรับ' }, { status: 400 })
  if (openTime !== null) updates.open_at = localBangkokIso(session.session_date, o)
  if (onTimeUntil !== null) updates.on_time_until = localBangkokIso(session.session_date, t)
  if (closeTime !== null) updates.close_at = localBangkokIso(session.session_date, c)
  if ('allowLate' in body) updates.allow_late = Boolean(body.allowLate)
  if ('isOpen' in body) {
    updates.is_open = Boolean(body.isOpen)
    updates.closed_at = body.isOpen ? null : new Date().toISOString()
  }
  const { data, error } = await admin.from('attendance_sessions').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: `แก้ไขรอบไม่สำเร็จ: ${error.message}` }, { status: 500 })
  return NextResponse.json({ session: data })
}
