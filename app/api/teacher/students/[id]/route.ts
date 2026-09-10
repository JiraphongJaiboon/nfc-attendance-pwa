import { NextResponse } from 'next/server'
import { requireTeacherApi, ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { asPositiveInt, asString } from '@/lib/validation'
import { validatePin } from '@/lib/utils'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await requireTeacherApi()
  if ('error' in teacher) return teacher.error
  const admin = createAdminSupabase()
  const { data: current } = await admin.from('students').select('*').eq('id', id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'ไม่พบนักเรียน' }, { status: 404 })
  const sourceAccess = await ensureTeacherClassroom(current.classroom_id)
  if ('error' in sourceAccess) return sourceAccess.error

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if ('number' in body) {
    const number = asPositiveInt(body.number)
    if (!number) return NextResponse.json({ error: 'เลขที่ไม่ถูกต้อง' }, { status: 400 })
    updates.number = number
  }
  if ('prefix' in body) updates.prefix = asString(body.prefix, 30)
  if ('firstName' in body) {
    const value = asString(body.firstName, 100)
    if (!value) return NextResponse.json({ error: 'ชื่อห้ามว่าง' }, { status: 400 })
    updates.first_name = value
  }
  if ('lastName' in body) {
    const value = asString(body.lastName, 100)
    if (!value) return NextResponse.json({ error: 'นามสกุลห้ามว่าง' }, { status: 400 })
    updates.last_name = value
  }
  if ('active' in body) updates.active = Boolean(body.active)

  const targetClassroom = asString(body.classroomId, 100)
  if (targetClassroom && targetClassroom !== current.classroom_id) {
    const targetAccess = await ensureTeacherClassroom(targetClassroom)
    if ('error' in targetAccess) return targetAccess.error
    const { count } = await admin.from('attendance').select('id', { head: true, count: 'exact' }).eq('student_id', id)
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: 'นักเรียนมีประวัติการเช็กชื่อแล้ว ระบบจึงไม่ย้ายห้องอัตโนมัติเพื่อป้องกันประวัติย้อนหลังผิดห้อง กรุณาสร้างบัญชีใหม่หรือดำเนินการย้ายโดยผู้ดูแลฐานข้อมูลตามขั้นตอนใน README',
        code: 'MOVE_BLOCKED_HISTORY',
      }, { status: 409 })
    }
    const { data: duplicateNumber } = await admin.from('students').select('id').eq('classroom_id', targetClassroom).eq('number', updates.number ?? current.number).neq('id', id).maybeSingle()
    if (duplicateNumber) return NextResponse.json({ error: 'เลขที่ซ้ำในห้องปลายทาง' }, { status: 409 })
    updates.classroom_id = targetClassroom
  }

  if ('pin' in body && body.pin !== '') {
    const pin = String(body.pin)
    if (!validatePin(pin)) return NextResponse.json({ error: 'PIN ต้องเป็นตัวเลขอย่างน้อย 6 ตัว' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(id, { password: pin })
    if (error) return NextResponse.json({ error: 'เปลี่ยน PIN ไม่สำเร็จ' }, { status: 500 })
  }

  const { data: updated, error } = await admin.from('students').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'เลขที่หรือข้อมูลซ้ำในห้อง' : 'แก้ไขนักเรียนไม่สำเร็จ' }, { status: 500 })

  if (targetClassroom && targetClassroom !== current.classroom_id) {
    await admin.from('student_classroom_moves').insert({
      student_id: id,
      from_classroom_id: current.classroom_id,
      to_classroom_id: targetClassroom,
      moved_by: teacher.user.id,
      note: 'ย้ายห้องผ่านหน้าเว็บ (อนุญาตเฉพาะนักเรียนที่ยังไม่มีประวัติเช็กชื่อ)',
    })
  }
  const displayName = `${updated.prefix}${updated.first_name} ${updated.last_name}`.trim()
  await admin.from('profiles').update({ display_name: displayName }).eq('id', id)
  await admin.auth.admin.updateUserById(id, { user_metadata: { role: 'student', display_name: displayName, student_code: updated.student_code } })
  return NextResponse.json({ student: updated })
}
