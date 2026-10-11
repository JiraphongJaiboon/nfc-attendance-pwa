import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function deadlineFor(quiz: any, startedAt: string) {
  const close = new Date(quiz.closes_at).getTime()
  const durationEnd = quiz.duration_minutes
    ? new Date(startedAt).getTime() + quiz.duration_minutes * 60_000
    : close
  return new Date(Math.min(close, durationEnd)).toISOString()
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await getCurrentUser()
  if (!auth.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 })
  if (auth.profile?.role !== 'student') return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 })

  const admin = createAdminSupabase()
  const [{ data: student }, { data: quiz }] = await Promise.all([
    admin.from('students').select('id, classroom_id, active').eq('id', auth.user.id).maybeSingle(),
    admin.from('quizzes').select('*').eq('id', id).maybeSingle(),
  ])
  if (!student || !student.active) return NextResponse.json({ error: 'บัญชีนักเรียนถูกระงับหรือไม่พบข้อมูล' }, { status: 403 })
  if (!quiz || !quiz.is_published || quiz.is_archived || quiz.classroom_id !== student.classroom_id) {
    return NextResponse.json({ error: 'ไม่พบแบบทดสอบสำหรับห้องของคุณ' }, { status: 404 })
  }

  const now = new Date()
  const open = new Date(quiz.opens_at)
  const close = new Date(quiz.closes_at)
  if (now < open) return NextResponse.json({ error: 'แบบทดสอบยังไม่เปิดให้ทำ' }, { status: 403 })
  if (now >= close) return NextResponse.json({ error: 'แบบทดสอบปิดรับคำตอบแล้ว' }, { status: 403 })

  const { data: attempts } = await admin
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', id)
    .eq('student_id', student.id)
    .order('attempt_no', { ascending: false })

  let current = (attempts ?? []).find((a) => a.status === 'in_progress')
  if (current && now.getTime() >= new Date(deadlineFor(quiz, current.started_at)).getTime()) {
    await admin.from('quiz_attempts').update({ status: 'expired' }).eq('id', current.id)
    current = undefined
  }

  if (!current && (attempts ?? []).length >= quiz.max_attempts) {
    return NextResponse.json({ error: 'คุณใช้สิทธิ์ทำแบบทดสอบครบจำนวนครั้งแล้ว' }, { status: 403 })
  }

  const { data: questions, error: questionError } = await admin
    .from('quiz_questions')
    .select('id, position, question_text, choice_a, choice_b, choice_c, choice_d, points')
    .eq('quiz_id', id)
    .order('position')

  if (questionError || !questions?.length) {
    return NextResponse.json({ error: 'แบบทดสอบยังไม่มีคำถาม' }, { status: 500 })
  }

  if (!current) {
    const maxScore = questions.reduce((sum, q) => sum + Number(q.points || 0), 0)
    const { data: created, error } = await admin.from('quiz_attempts').insert({
      quiz_id: id,
      student_id: student.id,
      attempt_no: (attempts?.[0]?.attempt_no ?? 0) + 1,
      started_at: now.toISOString(),
      status: 'in_progress',
      max_score: maxScore,
    }).select('*').single()
    if (error || !created) return NextResponse.json({ error: `เริ่มทำแบบทดสอบไม่สำเร็จ: ${error?.message ?? ''}` }, { status: 500 })
    current = created
  }

  const safeQuestions = questions.map((q) => ({
    id: q.id,
    position: q.position,
    question_text: q.question_text,
    points: q.points,
    choices: [
      { value: 'A', label: q.choice_a },
      { value: 'B', label: q.choice_b },
      { value: 'C', label: q.choice_c },
      { value: 'D', label: q.choice_d },
    ],
  }))

  if (quiz.shuffle_questions) {
    for (let i = safeQuestions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[safeQuestions[i], safeQuestions[j]] = [safeQuestions[j], safeQuestions[i]]
    }
  }

  return NextResponse.json({
    serverNow: now.toISOString(),
    deadline: deadlineFor(quiz, current.started_at),
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      show_score_after_submit: quiz.show_score_after_submit,
    },
    attempt: { id: current.id, started_at: current.started_at, attempt_no: current.attempt_no },
    questions: safeQuestions,
  })
}
