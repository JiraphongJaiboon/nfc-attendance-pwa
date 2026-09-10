import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isValidHttpUrl } from '@/lib/media'
import { asString } from '@/lib/validation'
import type { LearningMaterial, LearningMaterialType } from '@/types/database'

const TYPES = new Set<LearningMaterialType>(['video', 'image', 'slide', 'link'])

async function withSignedUrls(materials: LearningMaterial[]) {
  const admin = createAdminSupabase()
  return Promise.all(materials.map(async (material) => {
    if (material.external_url) return { ...material, view_url: material.external_url }
    if (!material.storage_path) return { ...material, view_url: null }
    const { data, error } = await admin.storage.from('teaching-media').createSignedUrl(material.storage_path, 60 * 60)
    if (error) console.error('CREATE MATERIAL SIGNED URL ERROR:', error)
    return { ...material, view_url: data?.signedUrl ?? null }
  }))
}

export async function GET(request: Request) {
  const classroomId = new URL(request.url).searchParams.get('classroomId') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('learning_materials')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('sort_order')
    .order('created_at')

  if (error) {
    console.error('LOAD MATERIALS ERROR:', error)
    return NextResponse.json({ error: `โหลดสื่อการสอนไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }

  const materials = await withSignedUrls((data ?? []) as LearningMaterial[])
  return NextResponse.json({ materials })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const classroomId = asString(body.classroomId, 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const title = asString(body.title, 200)
  const description = asString(body.description, 5000)
  const materialType = asString(body.materialType, 30) as LearningMaterialType
  const externalUrl = asString(body.externalUrl, 2000)
  const storagePath = asString(body.storagePath, 1000)
  const originalFileName = asString(body.originalFileName, 255)
  const mimeType = asString(body.mimeType, 255)
  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
  const isPublished = body.isPublished !== false

  if (!title || !TYPES.has(materialType)) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อและประเภทสื่อให้ถูกต้อง' }, { status: 400 })
  }
  if (!!externalUrl === !!storagePath) {
    return NextResponse.json({ error: 'กรุณาเลือกใช้ลิงก์หรือไฟล์อัปโหลดอย่างใดอย่างหนึ่ง' }, { status: 400 })
  }
  if (externalUrl && !isValidHttpUrl(externalUrl)) {
    return NextResponse.json({ error: 'URL สื่อไม่ถูกต้อง ต้องขึ้นต้นด้วย http:// หรือ https://' }, { status: 400 })
  }
  if (storagePath && !storagePath.startsWith(`${auth.user.id}/${classroomId}/`)) {
    return NextResponse.json({ error: 'ไฟล์อัปโหลดไม่ตรงกับครูหรือห้องเรียนที่เลือก' }, { status: 403 })
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin.from('learning_materials').insert({
    classroom_id: classroomId,
    teacher_id: auth.user.id,
    title,
    description,
    material_type: materialType,
    external_url: externalUrl || null,
    storage_path: storagePath || null,
    original_file_name: originalFileName || null,
    mime_type: mimeType || null,
    sort_order: sortOrder,
    is_published: isPublished,
  }).select('*').single()

  if (error) {
    console.error('CREATE MATERIAL ERROR:', error)
    if (storagePath) await admin.storage.from('teaching-media').remove([storagePath]).catch(() => undefined)
    return NextResponse.json({ error: `เพิ่มสื่อไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }

  const [material] = await withSignedUrls([data as LearningMaterial])
  return NextResponse.json({ material }, { status: 201 })
}
