import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminSupabase()
  const { data: quiz } = await admin.from('quizzes').select('id, classroom_id').eq('id', id).maybeSingle()
  if (!quiz) return NextResponse.json({ error: 'ไม่พบแบบทดสอบ' }, { status: 404 })

  const auth = await ensureTeacherClassroom(quiz.classroom_id)
  if ('error' in auth) return auth.error

  const [{ data: students, error: studentError }, { data: attempts, error: attemptError }] = await Promise.all([
    admin.from('students').select('id, number, student_code, prefix, first_name, last_name, active').eq('classroom_id', quiz.classroom_id).order('number'),
    admin.from('quiz_attempts').select('*').eq('quiz_id', id).order('attempt_no', { ascending: false }),
  ])

  if (studentError || attemptError) {
    return NextResponse.json({ error: `โหลดคะแนนไม่สำเร็จ: ${studentError?.message ?? attemptError?.message}` }, { status: 500 })
  }

  const latest = new Map<string, any>()
  for (const attempt of attempts ?? []) if (!latest.has(attempt.student_id)) latest.set(attempt.student_id, attempt)

  const results = (students ?? []).map((student) => {
    const attempt = latest.get(student.id)
    return {
      student_id: student.id,
      number: student.number,
      student_code: student.student_code,
      name: `${student.prefix ?? ''}${student.first_name} ${student.last_name}`.trim(),
      status: attempt?.status ?? 'not_started',
      score: attempt?.status === 'submitted' ? attempt.score : null,
      max_score: attempt?.status === 'submitted' ? attempt.max_score : null,
      submitted_at: attempt?.submitted_at ?? null,
    }
  })

  return NextResponse.json({ results })
}
