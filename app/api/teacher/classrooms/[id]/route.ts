import { NextResponse } from 'next/server'
import { ensureTeacherClassroom, requireTeacherApi } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { asString } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await ensureTeacherClassroom(id)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if ('name' in body) {
    const name = asString(body.name, 100)
    if (!name) return NextResponse.json({ error: 'ชื่อห้องเรียนห้ามว่าง' }, { status: 400 })
    updates.name = name
  }
  if ('is_active' in body) updates.is_active = Boolean(body.is_active)
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องแก้ไข' }, { status: 400 })
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('classrooms').update(updates).eq('id', id).select('*').single()
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'มีชื่อห้องนี้อยู่แล้ว' : 'แก้ไขห้องเรียนไม่สำเร็จ' }, { status: error.code === '23505' ? 409 : 500 })
  }
  return NextResponse.json({ classroom: data })
}


export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth.error

  const admin = createAdminSupabase()
  const { data: room, error: roomError } = await admin
    .from('classrooms')
    .select('id, teacher_id, name')
    .eq('id', id)
    .maybeSingle()

  if (roomError || !room) {
    return NextResponse.json({ error: 'ไม่พบห้องเรียน' }, { status: 404 })
  }

  // การลบถาวรให้เฉพาะเจ้าของห้องเท่านั้น
  if (room.teacher_id !== auth.user.id) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของห้องเท่านั้นที่ลบห้องได้' }, { status: 403 })
  }

  const [
    studentsResult,
    sessionsResult,
    attendanceResult,
    materialsResult,
    quizzesResult,
    movesFromResult,
    movesToResult,
  ] = await Promise.all([
    admin.from('students').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
    admin.from('attendance_sessions').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
    admin.from('attendance').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
    admin.from('learning_materials').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
    admin.from('quizzes').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
    admin.from('student_classroom_moves').select('id', { count: 'exact', head: true }).eq('from_classroom_id', id),
    admin.from('student_classroom_moves').select('id', { count: 'exact', head: true }).eq('to_classroom_id', id),
  ])

  const checkError =
    studentsResult.error ||
    sessionsResult.error ||
    attendanceResult.error ||
    materialsResult.error ||
    quizzesResult.error ||
    movesFromResult.error ||
    movesToResult.error

  if (checkError) {
    console.error('CHECK CLASSROOM DELETE ERROR:', checkError)
    return NextResponse.json({ error: 'ตรวจสอบข้อมูลในห้องก่อนลบไม่สำเร็จ' }, { status: 500 })
  }

  const problems: string[] = []
  if ((studentsResult.count ?? 0) > 0) problems.push(`นักเรียน ${studentsResult.count} คน`)
  if ((sessionsResult.count ?? 0) > 0) problems.push(`รอบเช็กชื่อ ${sessionsResult.count} รอบ`)
  if ((attendanceResult.count ?? 0) > 0) problems.push(`ประวัติเช็กชื่อ ${attendanceResult.count} รายการ`)
  if ((materialsResult.count ?? 0) > 0) problems.push(`สื่อการสอน ${materialsResult.count} รายการ`)
  if ((quizzesResult.count ?? 0) > 0) problems.push(`แบบทดสอบ ${quizzesResult.count} ชุด`)
  if ((movesFromResult.count ?? 0) + (movesToResult.count ?? 0) > 0) problems.push('ประวัติย้ายห้อง')

  if (problems.length) {
    return NextResponse.json({
      error: `ลบห้อง “${room.name}” ไม่ได้ เพราะยังมี ${problems.join(', ')} หากเป็นห้องที่ใช้งานแล้วให้ใช้ “ปิดห้อง” แทน`,
      code: 'CLASSROOM_HAS_HISTORY',
    }, { status: 409 })
  }

  const { error: deleteError } = await admin.from('classrooms').delete().eq('id', id)
  if (deleteError) {
    console.error('DELETE CLASSROOM ERROR:', deleteError)
    return NextResponse.json({
      error: 'ลบห้องไม่สำเร็จ อาจยังมีข้อมูลอื่นเชื่อมโยงกับห้องนี้',
    }, { status: 409 })
  }

  return NextResponse.json({ ok: true, deletedId: id })
}
