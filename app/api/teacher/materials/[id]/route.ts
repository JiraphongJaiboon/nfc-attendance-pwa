import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isValidHttpUrl } from '@/lib/media'
import { asString } from '@/lib/validation'
import type { LearningMaterial } from '@/types/database'

async function loadAuthorized(id: string) {
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('learning_materials').select('*').eq('id', id).maybeSingle()
  if (error || !data) return { error: NextResponse.json({ error: 'ไม่พบสื่อการสอน' }, { status: 404 }) }
  const auth = await ensureTeacherClassroom(data.classroom_id)
  if ('error' in auth) return auth
  return { admin, auth, material: data as LearningMaterial }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const loaded = await loadAuthorized(id)
  if ('error' in loaded) return loaded.error

  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if ('title' in body) {
    const title = asString(body.title, 200)
    if (!title) return NextResponse.json({ error: 'ชื่อสื่อห้ามว่าง' }, { status: 400 })
    patch.title = title
  }
  if ('description' in body) patch.description = asString(body.description, 5000)
  if ('sortOrder' in body) patch.sort_order = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
  if ('isPublished' in body) patch.is_published = Boolean(body.isPublished)
  if ('externalUrl' in body && loaded.material.external_url) {
    const externalUrl = asString(body.externalUrl, 2000)
    if (!externalUrl || !isValidHttpUrl(externalUrl)) return NextResponse.json({ error: 'URL ไม่ถูกต้อง' }, { status: 400 })
    patch.external_url = externalUrl
  }

  const { data, error } = await loaded.admin.from('learning_materials').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: `แก้ไขสื่อไม่สำเร็จ: ${error.message}` }, { status: 500 })
  return NextResponse.json({ material: data })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const loaded = await loadAuthorized(id)
  if ('error' in loaded) return loaded.error

  const { error } = await loaded.admin.from('learning_materials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: `ลบสื่อไม่สำเร็จ: ${error.message}` }, { status: 500 })
  if (loaded.material.storage_path) {
    const { error: storageError } = await loaded.admin.storage.from('teaching-media').remove([loaded.material.storage_path])
    if (storageError) console.error('DELETE MATERIAL FILE ERROR:', storageError)
  }
  return NextResponse.json({ ok: true })
}
