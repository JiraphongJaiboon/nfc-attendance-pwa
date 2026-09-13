import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

const MAX_PAGE_BYTES = 3 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp'])
function clean(value: FormDataEntryValue | null, max = 2000) { return String(value ?? '').trim().slice(0, max) }
function safeName(name: string) { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'page.jpg' }

export async function GET(request: Request) {
  const classroomId = new URL(request.url).searchParams.get('classroomId') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  const admin = createAdminSupabase()
  const { data: materials, error } = await admin.from('learning_materials')
    .select('*').eq('classroom_id', classroomId).eq('material_type', 'slide').order('sort_order').order('created_at')
  if (error) return NextResponse.json({ error: `โหลดสไลด์ไม่สำเร็จ: ${error.message}` }, { status: 500 })
  const ids = (materials ?? []).map((m) => m.id)
  const { data: pages } = ids.length ? await admin.from('slide_pages').select('material_id,page_no').in('material_id', ids) : { data: [] }
  const counts = new Map<string, number>()
  for (const p of pages ?? []) counts.set(p.material_id, (counts.get(p.material_id) ?? 0) + 1)
  return NextResponse.json({ slides: (materials ?? []).map((m) => ({ ...m, page_count: counts.get(m.id) ?? 0 })) })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const classroomId = clean(form.get('classroomId'), 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  const title = clean(form.get('title'), 200)
  const description = clean(form.get('description'), 5000)
  const file = form.get('file')
  if (!title) return NextResponse.json({ error: 'กรุณากรอกชื่อสไลด์' }, { status: 400 })
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'กรุณาเลือกภาพหน้าแรก' }, { status: 400 })
  if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'รองรับเฉพาะ JPG, PNG, WEBP' }, { status: 400 })
  if (file.size > MAX_PAGE_BYTES) return NextResponse.json({ error: 'ภาพแต่ละหน้าต้องไม่เกิน 3 MB' }, { status: 413 })

  const admin = createAdminSupabase()
  const materialId = randomUUID()
  const path = `${auth.user.id}/${classroomId}/comic/${materialId}/001-${safeName(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from('teaching-media').upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: `อัปโหลดหน้าแรกไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })

  const { data: material, error: materialError } = await admin.from('learning_materials').insert({
    id: materialId,
    classroom_id: classroomId,
    teacher_id: auth.user.id,
    title,
    description,
    material_type: 'slide',
    external_url: null,
    storage_path: path,
    original_file_name: file.name,
    mime_type: file.type,
    sort_order: Number(clean(form.get('sortOrder'), 20)) || 0,
    is_published: clean(form.get('isPublished'), 20) !== 'false',
  }).select('*').single()
  if (materialError || !material) {
    await admin.storage.from('teaching-media').remove([path])
    return NextResponse.json({ error: `สร้างชุดสไลด์ไม่สำเร็จ: ${materialError?.message || 'unknown'}` }, { status: 500 })
  }
  const { error: pageError } = await admin.from('slide_pages').insert({
    material_id: materialId, page_no: 1, storage_path: path, original_file_name: file.name, mime_type: file.type,
  })
  if (pageError) {
    await admin.from('learning_materials').delete().eq('id', materialId)
    await admin.storage.from('teaching-media').remove([path])
    return NextResponse.json({ error: `บันทึกหน้าสไลด์ไม่สำเร็จ: ${pageError.message}` }, { status: 500 })
  }
  return NextResponse.json({ material, pageNo: 1 }, { status: 201 })
}
