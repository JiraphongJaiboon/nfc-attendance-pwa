import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const auth = await getCurrentUser()
  if (!auth.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 })
  if (auth.profile?.role !== 'student') return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่นักเรียน' }, { status: 403 })
  const admin = createAdminSupabase()
  const { data: student } = await admin.from('students').select('id,classroom_id,active').eq('id', auth.user.id).maybeSingle()
  if (!student || !student.active) return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนหรือถูกระงับ' }, { status: 403 })
  const { data: material } = await admin.from('learning_materials').select('*').eq('id', id).eq('classroom_id', student.classroom_id).eq('material_type','slide').eq('is_published', true).maybeSingle()
  if (!material) return NextResponse.json({ error: 'ไม่พบสไลด์นี้' }, { status: 404 })
  const { data: pages } = await admin.from('slide_pages').select('*').eq('material_id', id).order('page_no')
  const signedPages = await Promise.all((pages ?? []).map(async (page) => {
    const { data } = await admin.storage.from('teaching-media').createSignedUrl(page.storage_path, 60 * 60)
    return { pageNo: page.page_no, url: data?.signedUrl ?? null, fileName: page.original_file_name }
  }))
  let fallbackUrl: string | null = material.external_url || null
  if (!fallbackUrl && material.storage_path && !signedPages.length) {
    const { data } = await admin.storage.from('teaching-media').createSignedUrl(material.storage_path, 60 * 60)
    fallbackUrl = data?.signedUrl ?? null
  }
  return NextResponse.json({ material: { id: material.id, title: material.title, description: material.description, mimeType: material.mime_type }, pages: signedPages.filter((p) => p.url), fallbackUrl })
}
