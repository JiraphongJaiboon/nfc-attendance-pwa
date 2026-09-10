import { NextResponse } from 'next/server'
import { requireTeacherApi } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { asString } from '@/lib/validation'

async function teacherClassroomIds(teacherId: string) {
  const admin = createAdminSupabase()
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    admin.from('classrooms').select('id').eq('teacher_id', teacherId),
    admin.from('classroom_teachers').select('classroom_id').eq('teacher_id', teacherId),
  ])
  return [...new Set([...(owned ?? []).map((r) => r.id), ...(memberships ?? []).map((r) => r.classroom_id)])]
}

export async function GET() {
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth.error

  const ids = await teacherClassroomIds(auth.user.id)
  if (!ids.length) return NextResponse.json({ classrooms: [] })

  const admin = createAdminSupabase()
  const { data: classrooms, error } = await admin
    .from('classrooms')
    .select('*')
    .in('id', ids)
    .order('name')

  if (error) {
    console.error('LOAD CLASSROOMS ERROR:', error)
    return NextResponse.json({ error: `โหลดห้องเรียนไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }

  const enriched = await Promise.all((classrooms ?? []).map(async (room) => {
    const [{ count }, { data: latest }] = await Promise.all([
      admin.from('students').select('id', { count: 'exact', head: true }).eq('classroom_id', room.id),
      admin.from('attendance_sessions').select('session_date').eq('classroom_id', room.id).order('session_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    return { ...room, student_count: count ?? 0, latest_session_date: latest?.session_date ?? null }
  }))

  return NextResponse.json({ classrooms: enriched })
}

export async function POST(request: Request) {
  try {
    const auth = await requireTeacherApi()
    if ('error' in auth) return auth.error

    const body = await request.json().catch(() => ({}))
    const name = asString(body.name, 100)
    if (!name) return NextResponse.json({ error: 'กรุณาระบุชื่อห้องเรียน' }, { status: 400 })

    const admin = createAdminSupabase()
    const { data, error } = await admin
      .from('classrooms')
      .insert({ teacher_id: auth.user.id, name, is_active: true })
      .select('*')
      .single()

    if (error) {
      console.error('CREATE CLASSROOM ERROR:', error)
      const duplicate = error.code === '23505'
      return NextResponse.json(
        { error: duplicate ? 'มีชื่อห้องนี้อยู่แล้ว' : `สร้างห้องเรียนไม่สำเร็จ: ${error.message}` },
        { status: duplicate ? 409 : 500 },
      )
    }

    return NextResponse.json({ classroom: data }, { status: 201 })
  } catch (error) {
    console.error('CREATE CLASSROOM SERVER ERROR:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดที่ Server กรุณาตรวจสอบการตั้งค่า Environment Variables' }, { status: 500 })
  }
}
