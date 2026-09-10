import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { safeFileName } from '@/lib/media'
import { asString } from '@/lib/validation'
import type { LearningMaterialType } from '@/types/database'

const LIMITS: Record<LearningMaterialType, number> = {
  image: 6 * 1024 * 1024,
  video: 6 * 1024 * 1024,
  slide: 6 * 1024 * 1024,
  link: 0,
}

const ALLOWED_MIME: Record<Exclude<LearningMaterialType, 'link'>, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  slide: [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const classroomId = asString(body.classroomId, 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const fileName = asString(body.fileName, 255)
  const contentType = asString(body.contentType, 255).toLowerCase()
  const size = Number(body.size)
  const materialType = asString(body.materialType, 30) as LearningMaterialType

  if (!fileName || !Number.isFinite(size) || size <= 0 || !['image', 'video', 'slide'].includes(materialType)) {
    return NextResponse.json({ error: 'ข้อมูลไฟล์ไม่ถูกต้อง' }, { status: 400 })
  }
  const allowed = ALLOWED_MIME[materialType as Exclude<LearningMaterialType, 'link'>]
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const officeFallback = materialType === 'slide' && contentType === 'application/octet-stream' && ['pdf', 'ppt', 'pptx'].includes(ext)
  if (!allowed.includes(contentType) && !officeFallback) {
    return NextResponse.json({ error: 'ชนิดไฟล์นี้ไม่รองรับ กรุณาใช้ JPG/PNG/WEBP/GIF, MP4/WEBM/MOV หรือ PDF/PPT/PPTX' }, { status: 400 })
  }
  if (size > LIMITS[materialType]) {
    const mb = Math.round(LIMITS[materialType] / 1024 / 1024)
    return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${mb} MB แนะนำวิดีโอขนาดใหญ่ให้อัปโหลด YouTube/Drive แล้วใช้ลิงก์` }, { status: 413 })
  }

  const path = `${auth.user.id}/${classroomId}/${randomUUID()}-${safeFileName(fileName)}`
  const admin = createAdminSupabase()
  const { data, error } = await admin.storage.from('teaching-media').createSignedUploadUrl(path)
  if (error || !data) {
    console.error('CREATE SIGNED UPLOAD ERROR:', error)
    return NextResponse.json({ error: 'เตรียมพื้นที่อัปโหลดไม่สำเร็จ' }, { status: 500 })
  }

  return NextResponse.json({ path, token: data.token })
}
