import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
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
