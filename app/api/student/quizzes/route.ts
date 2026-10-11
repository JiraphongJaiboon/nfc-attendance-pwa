import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await getCurrentUser()
  if (!auth.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 })
  if (auth.profile?.role !== 'student') return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 })

  const admin = createAdminSupabase()
  const { data: student } = await admin.from('students').select('id, classroom_id, active').eq('id', auth.user.id).maybeSingle()
  if (!student || !student.active) return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนหรือบัญชีถูกระงับ' }, { status: 403 })

  const [{ data: quizzes, error }, { data: attempts }] = await Promise.all([
    admin.from('quizzes').select('id, title, description, opens_at, closes_at, duration_minutes, max_attempts, show_score_after_submit').eq('classroom_id', student.classroom_id).eq('is_published', true).eq('is_archived', false).order('opens_at', { ascending: false }),
    admin.from('quiz_attempts').select('quiz_id, attempt_no, status, score, max_score, submitted_at').eq('student_id', student.id).order('attempt_no', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: `โหลดแบบทดสอบไม่สำเร็จ: ${error.message}` }, { status: 500 })

  const byQuiz = new Map<string, any[]>()
  for (const attempt of attempts ?? []) {
    const list = byQuiz.get(attempt.quiz_id) ?? []
    list.push(attempt)
    byQuiz.set(attempt.quiz_id, list)
  }

  return NextResponse.json({
    serverNow: new Date().toISOString(),
    quizzes: (quizzes ?? []).map((q) => {
      const list = byQuiz.get(q.id) ?? []
      return {
        ...q,
        attempts_used: list.length,
        latest_attempt: list[0] ?? null,
      }
    }),
  })
}
