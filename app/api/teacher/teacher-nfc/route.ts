import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireTeacherApi } from '@/lib/auth'
import { serverEnv } from '@/lib/env'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth.error
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('teacher_nfc_tokens')
    .select('status,issued_at,last_used_at')
    .eq('teacher_id', auth.user.id)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'โหลดสถานะ NFC ครูไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ active: !!data, issued_at: data?.issued_at ?? null, last_used_at: data?.last_used_at ?? null })
}

export async function POST() {
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth.error
  const admin = createAdminSupabase()
  const now = new Date().toISOString()

  await admin.from('teacher_nfc_tokens')
    .update({ status: 'revoked', revoked_at: now })
    .eq('teacher_id', auth.user.id)
    .eq('status', 'active')

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { error } = await admin.from('teacher_nfc_tokens').insert({
    teacher_id: auth.user.id,
    token_hash: tokenHash,
    status: 'active',
  })
  if (error) return NextResponse.json({ error: `สร้าง NFC ครูไม่สำเร็จ: ${error.message}` }, { status: 500 })

  const { siteUrl } = serverEnv()
  return NextResponse.json({ url: `${siteUrl}/teacher-nfc/${token}` }, { status: 201 })
}

export async function DELETE() {
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth.error
  const admin = createAdminSupabase()
  const { error } = await admin.from('teacher_nfc_tokens')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('teacher_id', auth.user.id)
    .eq('status', 'active')
  if (error) return NextResponse.json({ error: 'ยกเลิก NFC ครูไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
