import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

function clean(value: unknown, max = 2000) { return String(value ?? '').trim().slice(0, max) }

const SEED_TOPICS = [
  { slug: 'prism-pyramid', tag: 'A01', num: '01', title: 'ปริซึมและพีระมิด', subtitle: 'หน่วยที่ 1 — รูปทรงหลายเหลี่ยม', info: 'ทำความเข้าใจฐาน หน้า และยอดของปริซึมและพีระมิด', shape_key: 'prism', game_type: 'fold', sort_order: 1 },
  { slug: 'cylinder-cone', tag: 'A02', num: '02', title: 'ทรงกระบอกและกรวย', subtitle: 'หน่วยที่ 2 — รูปทรงกลม', info: 'สำรวจความสัมพันธ์ระหว่างทรงกระบอก กรวย และหน้าตัด', shape_key: 'cylinder', game_type: 'spin', sort_order: 2 },
  { slug: 'cross-section', tag: 'A03', num: '03', title: 'หน้าตัดของรูปทรง 3 มิติ', subtitle: 'หน่วยที่ 3 — Cross-section', info: 'ฝึกจินตนาการรูปร่างที่ได้เมื่อระนาบตัดผ่านทรงตัน', shape_key: 'cylinder', game_type: 'spin', sort_order: 3 },
  { slug: 'sphere-volume', tag: 'A04', num: '04', title: 'ทรงกลมและปริมาตร', subtitle: 'หน่วยที่ 4 — Sphere', info: 'เรียนรู้พื้นที่ผิวและปริมาตรของทรงกลม', shape_key: 'sphere', game_type: 'fold', sort_order: 4 },
] as const

const SEED_QUESTIONS: Record<string, Array<{ prompt: string; options: [string,string,string,string]; answer: string; hint: string }>> = {
  'prism-pyramid': [
    { prompt: 'ปริซึมสามเหลี่ยมมีฐานรูปแบบใด?', options: ['สามเหลี่ยม','สี่เหลี่ยม','วงกลม','หกเหลี่ยม'], answer: 'สามเหลี่ยม', hint: 'ฐานทั้งสองด้านเป็นสามเหลี่ยม' },
    { prompt: 'ปริซึมสามเหลี่ยมมีทั้งหมดกี่หน้า?', options: ['4 หน้า','5 หน้า','6 หน้า','8 หน้า'], answer: '5 หน้า', hint: 'ฐาน 2 หน้า และหน้าด้านข้าง 3 หน้า' },
    { prompt: 'ปริซึมมีพื้นที่ฐาน 12 ตร.ซม. สูง 5 ซม. มีปริมาตรเท่าไร?', options: ['17 ลบ.ซม.','30 ลบ.ซม.','60 ลบ.ซม.','120 ลบ.ซม.'], answer: '60 ลบ.ซม.', hint: 'ปริมาตร = พื้นที่ฐาน × ความสูง' },
    { prompt: 'พีระมิดฐานสี่เหลี่ยมมีจุดยอดทั้งหมดกี่จุด?', options: ['4 จุด','5 จุด','6 จุด','8 จุด'], answer: '5 จุด', hint: 'ฐาน 4 จุดและยอด 1 จุด' },
  ],
  'cylinder-cone': [
    { prompt: 'รูปทรงที่มีฐานกลมและปลายแหลมเรียกว่าอะไร?', options: ['ทรงกระบอก','กรวย','ปริซึม','พีระมิด'], answer: 'กรวย', hint: 'กรวยมีฐานกลมและยอดแหลม' },
    { prompt: 'ทรงกระบอกมีฐานเป็นรูปร่างใด?', options: ['สามเหลี่ยม','สี่เหลี่ยม','วงกลม','หกเหลี่ยม'], answer: 'วงกลม', hint: 'ฐานบนและล่างเป็นวงกลม' },
    { prompt: 'กรวยมีปริมาตรเป็นกี่ส่วนของทรงกระบอกที่มีฐานและสูงเท่ากัน?', options: ['1/2','1/3','2/3','เท่ากัน'], answer: '1/3', hint: 'V กรวย = ⅓πr²h' },
    { prompt: 'ทรงกระบอกรัศมี 2 ซม. สูง 5 ซม. ใช้ π = 3.14 มีปริมาตรเท่าไร?', options: ['31.4 ลบ.ซม.','62.8 ลบ.ซม.','125.6 ลบ.ซม.','251.2 ลบ.ซม.'], answer: '62.8 ลบ.ซม.', hint: 'V = πr²h' },
  ],
  'cross-section': [
    { prompt: 'ตัดทรงกระบอกด้วยระนาบขนานกับฐาน จะได้รูปใด?', options: ['วงกลม','สี่เหลี่ยมผืนผ้า','สามเหลี่ยม','วงรี'], answer: 'วงกลม', hint: 'หน้าตัดมีรูปร่างเหมือนฐาน' },
    { prompt: 'มองทรงกระบอกจากด้านข้าง จะเห็นรูปใด?', options: ['วงกลม','สี่เหลี่ยมผืนผ้า','สามเหลี่ยม','หกเหลี่ยม'], answer: 'สี่เหลี่ยมผืนผ้า', hint: 'ผิวด้านข้างคลี่ได้เป็นสี่เหลี่ยมผืนผ้า' },
    { prompt: 'ตัดลูกบาศก์ด้วยระนาบขนานกับหน้าด้านหนึ่ง จะได้รูปใด?', options: ['สี่เหลี่ยมจัตุรัส','วงกลม','สามเหลี่ยม','ห้าเหลี่ยม'], answer: 'สี่เหลี่ยมจัตุรัส', hint: 'หน้าตัดขนานกับหน้าลูกบาศก์เหมือนหน้าเดิม' },
    { prompt: 'ตัดกรวยผ่านยอดและจุดศูนย์กลางของฐาน จะได้รูปใด?', options: ['วงกลม','สามเหลี่ยม','สี่เหลี่ยมผืนผ้า','วงรี'], answer: 'สามเหลี่ยม', hint: 'ระนาบผ่านยอดของกรวยให้หน้าตัดสามเหลี่ยม' },
  ],
  'sphere-volume': [
    { prompt: 'รูปทรงใดมีผิวโค้งทั้งหมดและไม่มีมุม?', options: ['ทรงกลม','ลูกบาศก์','กรวย','พีระมิด'], answer: 'ทรงกลม', hint: 'ทรงกลมไม่มีหน้าแบนและไม่มีมุม' },
    { prompt: 'ทรงกลมมีมุมกี่มุม?', options: ['0 มุม','1 มุม','4 มุม','8 มุม'], answer: '0 มุม', hint: 'ผิวโค้งต่อเนื่องทั้งหมด' },
    { prompt: 'ทรงกลมรัศมี 4 ซม. มีเส้นผ่านศูนย์กลางเท่าไร?', options: ['2 ซม.','4 ซม.','8 ซม.','16 ซม.'], answer: '8 ซม.', hint: 'เส้นผ่านศูนย์กลาง = 2 × รัศมี' },
    { prompt: 'สูตรปริมาตรของทรงกลมคือข้อใด?', options: ['πr²h','⅓πr²h','4/3πr³','2πr'], answer: '4/3πr³', hint: '4 ส่วน 3 × π × รัศมียกกำลังสาม' },
  ],
}

async function getTopic(admin: ReturnType<typeof createAdminSupabase>, topicId: string) {
  return admin.from('solidlab_topics').select('*').eq('id', topicId).maybeSingle()
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const classroomId = clean(params.get('classroomId'), 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  const admin = createAdminSupabase()

  const { data: topics, error } = await admin.from('solidlab_topics').select('*').eq('classroom_id', classroomId).order('sort_order').order('created_at')
  if (error) return NextResponse.json({ error: `โหลด SolidLab ไม่สำเร็จ: ${error.message}` }, { status: 500 })
  const topicIds = (topics ?? []).map((t) => t.id)
  const { data: questions } = topicIds.length
    ? await admin.from('solidlab_questions').select('*').in('topic_id', topicIds).order('sort_order').order('created_at')
    : { data: [] }
  const [{ data: students }, { data: scores }] = await Promise.all([
    admin.from('students').select('id,number,prefix,first_name,last_name,active').eq('classroom_id', classroomId).order('number'),
    admin.from('solidlab_scores').select('student_id,points').eq('classroom_id', classroomId),
  ])
  const sums = new Map<string, number>()
  for (const row of scores ?? []) sums.set(row.student_id, (sums.get(row.student_id) ?? 0) + Number(row.points || 0))
  const scoreboard = (students ?? []).map((s) => ({ ...s, score: sums.get(s.id) ?? 0 })).sort((a,b) => b.score - a.score || a.number - b.number)
  return NextResponse.json({ topics: topics ?? [], questions: questions ?? [], scoreboard })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const action = clean(body.action, 50)
  const admin = createAdminSupabase()

  if (['seed','create-topic'].includes(action)) {
    const classroomId = clean(body.classroomId, 100)
    const auth = await ensureTeacherClassroom(classroomId)
    if ('error' in auth) return auth.error

    if (action === 'seed') {
      const seededTopics: any[] = []
      for (const item of SEED_TOPICS) {
        const { data: topic, error } = await admin.from('solidlab_topics').upsert({
          classroom_id: classroomId,
          teacher_id: auth.user.id,
          ...item,
          is_published: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'classroom_id,slug' }).select('*').single()
        if (error || !topic) return NextResponse.json({ error: `สร้างบทเรียนตัวอย่างไม่สำเร็จ: ${error?.message || 'unknown'}` }, { status: 500 })
        seededTopics.push(topic)
        const questions = SEED_QUESTIONS[item.slug] ?? []
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]
          const { error: qError } = await admin.from('solidlab_questions').upsert({
            topic_id: topic.id,
            game_type: item.game_type,
            prompt: q.prompt,
            option_a: q.options[0], option_b: q.options[1], option_c: q.options[2], option_d: q.options[3],
            answer: q.answer,
            hint: q.hint,
            explanation: '',
            sort_order: i + 1,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'topic_id,prompt' })
          if (qError) return NextResponse.json({ error: `สร้างคลังโจทย์ไม่สำเร็จ: ${qError.message}` }, { status: 500 })
        }
      }
      return NextResponse.json({ ok: true, topics: seededTopics })
    }

    const title = clean(body.title, 200)
    const slug = clean(body.slug, 120).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const shapeKey = ['cube','prism','cylinder','sphere'].includes(body.shapeKey) ? body.shapeKey : 'cube'
    const gameType = body.gameType === 'fold' ? 'fold' : 'spin'
    if (!title || !slug) return NextResponse.json({ error: 'กรุณากรอกชื่อและ slug' }, { status: 400 })
    const { data, error } = await admin.from('solidlab_topics').insert({
      classroom_id: classroomId, teacher_id: auth.user.id, slug,
      tag: clean(body.tag, 20), num: clean(body.num, 20), title,
      subtitle: clean(body.subtitle, 255), info: clean(body.info, 5000),
      shape_key: shapeKey, game_type: gameType,
      sort_order: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      is_published: body.isPublished !== false,
    }).select('*').single()
    if (error) return NextResponse.json({ error: `เพิ่มบทเรียนไม่สำเร็จ: ${error.message}` }, { status: 500 })
    return NextResponse.json({ topic: data }, { status: 201 })
  }

  if (['update-topic','delete-topic','create-question'].includes(action)) {
    const topicId = clean(body.topicId, 100)
    const { data: topic } = await getTopic(admin, topicId)
    if (!topic) return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 })
    const auth = await ensureTeacherClassroom(topic.classroom_id)
    if ('error' in auth) return auth.error

    if (action === 'delete-topic') {
      const { error } = await admin.from('solidlab_topics').delete().eq('id', topicId)
      if (error) return NextResponse.json({ error: `ลบบทเรียนไม่สำเร็จ: ${error.message}` }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update-topic') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if ('isPublished' in body) patch.is_published = Boolean(body.isPublished)
      if ('title' in body) patch.title = clean(body.title, 200)
      const { data, error } = await admin.from('solidlab_topics').update(patch).eq('id', topicId).select('*').single()
      if (error) return NextResponse.json({ error: `แก้ไขบทเรียนไม่สำเร็จ: ${error.message}` }, { status: 500 })
      return NextResponse.json({ topic: data })
    }

    const prompt = clean(body.prompt, 2000)
    const options = [clean(body.optionA, 500), clean(body.optionB, 500), clean(body.optionC, 500), clean(body.optionD, 500)]
    const answer = clean(body.answer, 500)
    if (!prompt || options.some((x) => !x) || !options.includes(answer)) {
      return NextResponse.json({ error: 'กรุณากรอกโจทย์ ตัวเลือก 4 ข้อ และเลือกคำตอบที่ตรงกับตัวเลือก' }, { status: 400 })
    }
    const { data, error } = await admin.from('solidlab_questions').insert({
      topic_id: topicId,
      game_type: topic.game_type,
      prompt,
      option_a: options[0], option_b: options[1], option_c: options[2], option_d: options[3],
      answer,
      hint: clean(body.hint, 2000), explanation: clean(body.explanation, 4000),
      sort_order: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      is_active: true,
    }).select('*').single()
    if (error) return NextResponse.json({ error: `เพิ่มโจทย์ไม่สำเร็จ: ${error.message}` }, { status: 500 })
    return NextResponse.json({ question: data }, { status: 201 })
  }

  if (action === 'delete-question') {
    const questionId = clean(body.questionId, 100)
    const { data: question } = await admin.from('solidlab_questions').select('id,topic_id').eq('id', questionId).maybeSingle()
    if (!question) return NextResponse.json({ error: 'ไม่พบโจทย์' }, { status: 404 })
    const { data: topic } = await getTopic(admin, question.topic_id)
    if (!topic) return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 })
    const auth = await ensureTeacherClassroom(topic.classroom_id)
    if ('error' in auth) return auth.error
    const { error } = await admin.from('solidlab_questions').delete().eq('id', questionId)
    if (error) return NextResponse.json({ error: `ลบโจทย์ไม่สำเร็จ: ${error.message}` }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
}
