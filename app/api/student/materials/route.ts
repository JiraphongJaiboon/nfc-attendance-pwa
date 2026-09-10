import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { LearningMaterial } from '@/types/database'

export async function GET() {
  const auth = await getCurrentUser()
  if (!auth.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 })
  if (auth.profile?.role !== 'student') return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 })

  const admin = createAdminSupabase()
  const { data: student } = await admin.from('students').select('id,classroom_id,active').eq('id', auth.user.id).maybeSingle()
  if (!student) return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 })
  if (!student.active) return NextResponse.json({ error: 'นักเรียนถูกระงับ' }, { status: 403 })

  const { data: classroom } = await admin.from('classrooms').select('id,name,is_active').eq('id', student.classroom_id).maybeSingle()
  if (!classroom || !classroom.is_active) return NextResponse.json({ error: 'ห้องเรียนนี้ปิดใช้งานอยู่' }, { status: 403 })

  const { data, error } = await admin.from('learning_materials')
    .select('*')
    .eq('classroom_id', student.classroom_id)
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: 'โหลดสื่อการสอนไม่สำเร็จ' }, { status: 500 })

  const materials = await Promise.all(((data ?? []) as LearningMaterial[]).map(async (material) => {
    if (material.external_url) return { ...material, view_url: material.external_url }
    if (!material.storage_path) return { ...material, view_url: null }
    const { data: signed } = await admin.storage.from('teaching-media').createSignedUrl(material.storage_path, 60 * 60)
    return { ...material, view_url: signed?.signedUrl ?? null }
  }))

  return NextResponse.json({ classroom: { id: classroom.id, name: classroom.name }, materials })
}
