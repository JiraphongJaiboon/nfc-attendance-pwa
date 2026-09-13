import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function clean(value: unknown, max = 2000) {
  return String(value ?? '').trim().slice(0, max)
}

async function studentContext() {
  const auth = await getCurrentUser()
  if (!auth.user) return { error: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 }) }
  if (auth.profile?.role !== 'student') return { error: NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 }) }

  const admin = createAdminSupabase()
  const { data: student } = await admin
    .from('students')
    .select('id,classroom_id,active,number,prefix,first_name,last_name')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!student) return { error: NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 }) }
  if (!student.active) return { error: NextResponse.json({ error: 'นักเรียนถูกระงับ' }, { status: 403 }) }

  const { data: classroom } = await admin
    .from('classrooms')
    .select('id,name,is_active')
    .eq('id', student.classroom_id)
    .maybeSingle()
  if (!classroom || !classroom.is_active) return { error: NextResponse.json({ error: 'ห้องเรียนนี้ปิดใช้งานอยู่' }, { status: 403 }) }

  return { auth, admin, student, classroom }
}

export async function GET(request: Request) {
  const ctx = await studentContext()
  if ('error' in ctx) return ctx.error
  const params = new URL(request.url).searchParams
  const action = params.get('action') || 'topics'

  if (action === 'topics') {
    const [{ data: topics, error }, { data: scores }] = await Promise.all([
      ctx.admin.from('solidlab_topics')
        .select('id,slug,tag,num,title,subtitle,info,shape_key,game_type,sort_order,is_published')
        .eq('classroom_id', ctx.student.classroom_id)
        .eq('is_published', true)
        .order('sort_order')
        .order('created_at'),
      ctx.admin.from('solidlab_scores')
        .select('topic_id,points')
        .eq('classroom_id', ctx.student.classroom_id)
        .eq('student_id', ctx.student.id),
    ])
    if (error) return NextResponse.json({ error: `โหลดบทเรียน 3D ไม่สำเร็จ: ${error.message}` }, { status: 500 })
    const topicScores: Record<string, number> = {}
    for (const row of scores ?? []) topicScores[row.topic_id] = (topicScores[row.topic_id] ?? 0) + Number(row.points || 0)
    const totalScore = Object.values(topicScores).reduce((sum, value) => sum + value, 0)
    return NextResponse.json({
      classroom: { id: ctx.classroom.id, name: ctx.classroom.name },
      student: { id: ctx.student.id, number: ctx.student.number, name: `${ctx.student.prefix}${ctx.student.first_name} ${ctx.student.last_name}` },
      topics: topics ?? [], topicScores, totalScore,
    })
  }

  if (action === 'question') {
    const topicId = clean(params.get('topicId'), 100)
    const exclude = new Set(clean(params.get('exclude'), 4000).split(',').map((v) => v.trim()).filter(Boolean))
    const { data: topic } = await ctx.admin.from('solidlab_topics')
      .select('id,classroom_id,is_published')
      .eq('id', topicId)
      .maybeSingle()
    if (!topic || !topic.is_published || topic.classroom_id !== ctx.student.classroom_id) {
      return NextResponse.json({ error: 'ไม่พบบทเรียนนี้' }, { status: 404 })
    }
    const { data: questions, error } = await ctx.admin.from('solidlab_questions')
      .select('id,game_type,prompt,option_a,option_b,option_c,option_d,hint,explanation,sort_order')
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
    if (error) return NextResponse.json({ error: 'โหลดคำถามไม่สำเร็จ' }, { status: 500 })
    const all = questions ?? []
    if (!all.length) return NextResponse.json({ error: 'ครูยังไม่ได้เพิ่มคำถามในบทเรียนนี้' }, { status: 404 })

    let available = all.filter((q) => !exclude.has(q.id))
    let cycleReset = false
    if (!available.length) {
      const last = [...exclude].at(-1)
      available = all.filter((q) => q.id !== last)
      if (!available.length) available = all
      cycleReset = true
    }
    const picked = available[Math.floor(Math.random() * available.length)]
    return NextResponse.json({
      question: {
        id: picked.id,
        gameType: picked.game_type,
        prompt: picked.prompt,
        options: [picked.option_a, picked.option_b, picked.option_c, picked.option_d],
        hint: picked.hint,
      },
      questionCount: all.length,
      cycleReset,
    })
  }

  return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
}

export async function POST(request: Request) {
  const ctx = await studentContext()
  if ('error' in ctx) return ctx.error
  const body = await request.json().catch(() => ({}))
  if (body.action !== 'answer') return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })

  const questionId = clean(body.questionId, 100)
  const selected = clean(body.answer, 1000)
  if (!questionId || !selected) return NextResponse.json({ error: 'กรุณาเลือกคำตอบ' }, { status: 400 })

  const { data: question } = await ctx.admin.from('solidlab_questions')
    .select('id,topic_id,option_a,option_b,option_c,option_d,answer,explanation,is_active')
    .eq('id', questionId)
    .maybeSingle()
  if (!question || !question.is_active) return NextResponse.json({ error: 'ไม่พบคำถามนี้' }, { status: 404 })

  const { data: topic } = await ctx.admin.from('solidlab_topics')
    .select('id,classroom_id,is_published')
    .eq('id', question.topic_id)
    .maybeSingle()
  if (!topic || !topic.is_published || topic.classroom_id !== ctx.student.classroom_id) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ตอบคำถามนี้' }, { status: 403 })
  }

  const options = [question.option_a, question.option_b, question.option_c, question.option_d]
  if (!options.includes(selected)) return NextResponse.json({ error: 'ตัวเลือกไม่ถูกต้อง' }, { status: 400 })
  const correct = selected.trim() === String(question.answer).trim()
  const { data: existing } = await ctx.admin.from('solidlab_scores')
    .select('points,is_correct,selected_answer')
    .eq('student_id', ctx.student.id)
    .eq('question_id', question.id)
    .maybeSingle()

  const newPoints = correct ? 10 : 0
  const bestPoints = Math.max(Number(existing?.points ?? 0), newPoints)
  const bestCorrect = Boolean(existing?.is_correct) || correct
  const bestAnswer = correct || !existing?.is_correct ? selected : (existing?.selected_answer ?? selected)

  const { error: saveError } = await ctx.admin.from('solidlab_scores').upsert({
    classroom_id: ctx.student.classroom_id,
    topic_id: topic.id,
    question_id: question.id,
    student_id: ctx.student.id,
    points: bestPoints,
    is_correct: bestCorrect,
    selected_answer: bestAnswer,
    answered_at: new Date().toISOString(),
  }, { onConflict: 'student_id,question_id' })
  if (saveError) return NextResponse.json({ error: `บันทึกคะแนนไม่สำเร็จ: ${saveError.message}` }, { status: 500 })

  const { data: scoreRows } = await ctx.admin.from('solidlab_scores')
    .select('points')
    .eq('student_id', ctx.student.id)
    .eq('classroom_id', ctx.student.classroom_id)
  const totalScore = (scoreRows ?? []).reduce((sum, row) => sum + Number(row.points || 0), 0)

  return NextResponse.json({
    ok: true,
    correct,
    correctAnswer: question.answer,
    explanation: question.explanation || '',
    awarded: bestPoints > Number(existing?.points ?? 0) ? newPoints : 0,
    totalScore,
  })
}
