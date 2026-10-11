import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminSupabase()
  const { data: quiz, error } = await admin.from('quizzes').select('*').eq('id', id).maybeSingle()
  if (error || !quiz) return NextResponse.json({ error: 'ไม่พบแบบทดสอบ' }, { status: 404 })

  const auth = await ensureTeacherClassroom(quiz.classroom_id)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('isPublished' in body) patch.is_published = body.isPublished === true

  const opensAt = parseDate(body.opensAt)
  const closesAt = parseDate(body.closesAt)
  if (opensAt === null || closesAt === null) return NextResponse.json({ error: 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง' }, { status: 400 })

  const nextOpen = opensAt ?? new Date(quiz.opens_at)
  const nextClose = closesAt ?? new Date(quiz.closes_at)
  if (nextClose <= nextOpen) return NextResponse.json({ error: 'เวลาปิดต้องอยู่หลังเวลาเปิด' }, { status: 400 })
  if (opensAt) patch.opens_at = opensAt.toISOString()
  if (closesAt) patch.closes_at = closesAt.toISOString()

  if ('durationMinutes' in body) {
    const duration = Number(body.durationMinutes)
    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      return NextResponse.json({ error: 'เวลาทำต้องอยู่ระหว่าง 1–300 นาที' }, { status: 400 })
    }
    patch.duration_minutes = duration
  }

  const { data, error: updateError } = await admin.from('quizzes').update(patch).eq('id', id).select('*').single()
  if (updateError) return NextResponse.json({ error: `บันทึกไม่สำเร็จ: ${updateError.message}` }, { status: 500 })
  return NextResponse.json({ quiz: data })
}
