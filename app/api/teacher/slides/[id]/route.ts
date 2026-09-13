import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const admin = createAdminSupabase()
  const { data: material } = await admin.from('learning_materials').select('id,classroom_id,material_type').eq('id', id).maybeSingle()
  if (!material || material.material_type !== 'slide') return NextResponse.json({ error: 'ไม่พบชุดสไลด์' }, { status: 404 })
  const auth = await ensureTeacherClassroom(material.classroom_id)
  if ('error' in auth) return auth.error
  const { data: pages } = await admin.from('slide_pages').select('storage_path').eq('material_id', id)
  const paths = [...new Set((pages ?? []).map((p) => p.storage_path).filter(Boolean))]
  if (paths.length) await admin.storage.from('teaching-media').remove(paths)
  const { error } = await admin.from('learning_materials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: `ลบสไลด์ไม่สำเร็จ: ${error.message}` }, { status: 500 })
  return NextResponse.json({ ok: true })
}
