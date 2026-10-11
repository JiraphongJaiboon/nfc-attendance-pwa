import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function deadlineFor(quiz: any, startedAt: string) {
  const close = new Date(quiz.closes_at).getTime()
  const durationEnd = quiz.duration_minutes
    ? new Date(startedAt).getTime() + quiz.duration_minutes * 60_000
    : close
  return Math.min(close, durationEnd)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await getCurrentUser()
  if (!auth.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 })
  if (auth.profile?.role !== 'student') return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
  const answers = body.answers && typeof body.answers === 'object' ? body.answers as Record<string, string> : {}
  if (!attemptId) return NextResponse.json({ error: 'ไม่พบรหัสการทำแบบทดสอบ' }, { status: 400 })

  const admin = createAdminSupabase()
  const [{ data: attempt }, { data: quiz }] = await Promise.all([
    admin.from('quiz_attempts').select('*').eq('id', attemptId).eq('quiz_id', id).maybeSingle(),
    admin.from('quizzes').select('*').eq('id', id).maybeSingle(),
  ])

  if (!attempt || attempt.student_id !== auth.user.id) return NextResponse.json({ error: 'ไม่พบสิทธิ์การทำแบบทดสอบนี้' }, { status: 403 })
  if (!quiz) return NextResponse.json({ error: 'ไม่พบแบบทดสอบ' }, { status: 404 })
  if (attempt.status === 'submitted') return NextResponse.json({ error: 'แบบทดสอบนี้ถูกส่งแล้ว' }, { status: 409 })
  if (attempt.status !== 'in_progress') return NextResponse.json({ error: 'แบบทดสอบนี้หมดเวลาหรือไม่สามารถส่งได้' }, { status: 409 })

  const now = new Date()
  if (now.getTime() > deadlineFor(quiz, attempt.started_at) + 5_000) {
    await admin.from('quiz_attempts').update({ status: 'expired' }).eq('id', attempt.id)
    return NextResponse.json({ error: 'หมดเวลาทำแบบทดสอบแล้ว ระบบไม่รับคำตอบเพิ่มเติม' }, { status: 403 })
  }

  const { data: questions, error } = await admin
    .from('quiz_questions')
    .select('id, correct_choice, points')
    .eq('quiz_id', id)

  if (error || !questions) return NextResponse.json({ error: 'ตรวจคำตอบไม่สำเร็จ' }, { status: 500 })

  let score = 0
  let answeredCount = 0
  const answerRows = []
  const validChoices = new Set(['A', 'B', 'C', 'D'])
  for (const q of questions) {
    const selected = answers[q.id]
    if (!validChoices.has(selected)) continue
    answeredCount += 1
    const isCorrect = selected === q.correct_choice
    const awarded = isCorrect ? Number(q.points) : 0
    score += awarded
    answerRows.push({
      attempt_id: attempt.id,
      question_id: q.id,
      selected_choice: selected,
      is_correct: isCorrect,
      awarded_points: awarded,
      answered_at: now.toISOString(),
    })
  }
  const maxScore = questions.reduce((sum, q) => sum + Number(q.points || 0), 0)

  if (answerRows.length) {
    const { error: answerError } = await admin.from('quiz_answers').upsert(answerRows, { onConflict: 'attempt_id,question_id' })
    if (answerError) return NextResponse.json({ error: `บันทึกคำตอบไม่สำเร็จ: ${answerError.message}` }, { status: 500 })
  }

  const { error: updateError } = await admin.from('quiz_attempts').update({
    status: 'submitted',
    score,
    max_score: maxScore,
    submitted_at: now.toISOString(),
  }).eq('id', attempt.id)

  if (updateError) return NextResponse.json({ error: `ส่งแบบทดสอบไม่สำเร็จ: ${updateError.message}` }, { status: 500 })

  return NextResponse.json({
    ok: true,
    answeredCount,
    questionCount: questions.length,
    score: quiz.show_score_after_submit ? score : null,
    maxScore: quiz.show_score_after_submit ? maxScore : null,
    showScore: quiz.show_score_after_submit,
    submittedAt: now.toISOString(),
  })
}
