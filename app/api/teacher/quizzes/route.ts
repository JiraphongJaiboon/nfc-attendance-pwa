import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { DEFAULT_ORTHOGRAPHIC_QUESTIONS } from '@/lib/quiz-default'
import { asString } from '@/lib/validation'

function validDate(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(request: Request) {
  const classroomId = new URL(request.url).searchParams.get('classroomId') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const admin = createAdminSupabase()
  const { data: quizzes, error } = await admin
    .from('quizzes')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: `โหลดแบบทดสอบไม่สำเร็จ: ${error.message}` }, { status: 500 })

  const ids = (quizzes ?? []).map((q) => q.id)
  const questionCount = new Map<string, number>()
  const submittedCount = new Map<string, number>()

  if (ids.length) {
    const [{ data: questions }, { data: attempts }] = await Promise.all([
      admin.from('quiz_questions').select('quiz_id').in('quiz_id', ids),
      admin.from('quiz_attempts').select('quiz_id, student_id, status').in('quiz_id', ids).eq('status', 'submitted'),
    ])
    for (const row of questions ?? []) questionCount.set(row.quiz_id, (questionCount.get(row.quiz_id) ?? 0) + 1)
    const seen = new Set<string>()
    for (const row of attempts ?? []) {
      const key = `${row.quiz_id}:${row.student_id}`
      if (seen.has(key)) continue
      seen.add(key)
      submittedCount.set(row.quiz_id, (submittedCount.get(row.quiz_id) ?? 0) + 1)
    }
  }

  return NextResponse.json({
    serverNow: new Date().toISOString(),
    quizzes: (quizzes ?? []).map((q) => ({
      ...q,
      question_count: questionCount.get(q.id) ?? 0,
      submitted_count: submittedCount.get(q.id) ?? 0,
    })),
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const classroomId = asString(body.classroomId, 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const title = asString(body.title, 200)
  const description = asString(body.description, 3000)
  const opensAt = validDate(asString(body.opensAt, 100))
  const closesAt = validDate(asString(body.closesAt, 100))
  const durationMinutes = Number(body.durationMinutes)
  const maxAttempts = Number(body.maxAttempts ?? 1)
  const isPublished = body.isPublished === true

  if (!title || !opensAt || !closesAt || closesAt <= opensAt) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อและช่วงเวลาเปิด–ปิดให้ถูกต้อง' }, { status: 400 })
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
    return NextResponse.json({ error: 'เวลาทำต้องอยู่ระหว่าง 1–300 นาที' }, { status: 400 })
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    return NextResponse.json({ error: 'จำนวนครั้งที่ทำต้องอยู่ระหว่าง 1–10 ครั้ง' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data: quiz, error } = await admin.from('quizzes').insert({
    classroom_id: classroomId,
    created_by: auth.user.id,
    title,
    description,
    opens_at: opensAt.toISOString(),
    closes_at: closesAt.toISOString(),
    duration_minutes: durationMinutes,
    max_attempts: maxAttempts,
    shuffle_questions: true,
    show_score_after_submit: true,
    is_published: isPublished,
  }).select('*').single()

  if (error || !quiz) return NextResponse.json({ error: `สร้างแบบทดสอบไม่สำเร็จ: ${error?.message ?? 'unknown error'}` }, { status: 500 })

  const rows = DEFAULT_ORTHOGRAPHIC_QUESTIONS.map((q, index) => ({
    quiz_id: quiz.id,
    position: index + 1,
    ...q,
  }))
  const { error: questionError } = await admin.from('quiz_questions').insert(rows)
  if (questionError) {
    await admin.from('quizzes').delete().eq('id', quiz.id)
    return NextResponse.json({ error: `สร้างคำถามไม่สำเร็จ: ${questionError.message}` }, { status: 500 })
  }

  return NextResponse.json({ quiz }, { status: 201 })
}
