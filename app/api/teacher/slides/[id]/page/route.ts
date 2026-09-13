import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

const MAX_PAGE_BYTES = 3 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp'])
function safeName(name: string) { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'page.jpg' }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const admin = createAdminSupabase()
  const { data: material } = await admin.from('learning_materials').select('id,classroom_id,teacher_id,material_type').eq('id', id).maybeSingle()
  if (!material || material.material_type !== 'slide') return NextResponse.json({ error: 'ไม่พบชุดสไลด์' }, { status: 404 })
  const auth = await ensureTeacherClassroom(material.classroom_id)
  if ('error' in auth) return auth.error

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'กรุณาเลือกภาพ' }, { status: 400 })
  if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'รองรับเฉพาะ JPG, PNG, WEBP' }, { status: 400 })
  if (file.size > MAX_PAGE_BYTES) return NextResponse.json({ error: 'ภาพแต่ละหน้าต้องไม่เกิน 3 MB' }, { status: 413 })

  const { data: last } = await admin.from('slide_pages').select('page_no').eq('material_id', id).order('page_no', { ascending: false }).limit(1).maybeSingle()
  const pageNo = Number(last?.page_no ?? 0) + 1
  if (pageNo > 100) return NextResponse.json({ error: 'หนึ่งชุดรองรับไม่เกิน 100 หน้า' }, { status: 400 })
  const path = `${auth.user.id}/${material.classroom_id}/comic/${id}/${String(pageNo).padStart(3,'0')}-${safeName(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from('teaching-media').upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: `อัปโหลดหน้า ${pageNo} ไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
  const { error } = await admin.from('slide_pages').insert({ material_id: id, page_no: pageNo, storage_path: path, original_file_name: file.name, mime_type: file.type })
  if (error) {
    await admin.storage.from('teaching-media').remove([path])
    return NextResponse.json({ error: `บันทึกหน้า ${pageNo} ไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }
  return NextResponse.json({ ok: true, pageNo }, { status: 201 })
}
