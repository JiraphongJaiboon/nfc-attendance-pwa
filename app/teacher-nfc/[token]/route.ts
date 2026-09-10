import { createHash } from 'node:crypto'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function homeWithError(request: NextRequest, code: string) {
  const url = new URL('/', request.url)
  url.searchParams.set('teacherNfcError', code)
  return NextResponse.redirect(url, { status: 303 })
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token || token.length < 20) return homeWithError(request, 'invalid')

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const admin = createAdminSupabase()
  const { data: tag, error: tagError } = await admin.from('teacher_nfc_tokens')
    .select('id,teacher_id,status')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (tagError || !tag) return homeWithError(request, 'invalid')
  if (tag.status !== 'active') return homeWithError(request, 'revoked')

  const { data: profile } = await admin.from('profiles').select('role').eq('id', tag.teacher_id).maybeSingle()
  if (profile?.role !== 'teacher') return homeWithError(request, 'not_teacher')

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(tag.teacher_id)
  const email = userResult.user?.email
  if (userError || !email) return homeWithError(request, 'auth_failed')

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link.properties?.hashed_token) return homeWithError(request, 'auth_failed')

  const supabase = await createServerSupabase()
  await supabase.auth.signOut().catch(() => undefined)
  const verificationType = (link.properties.verification_type || 'magiclink') as EmailOtpType
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: verificationType,
  })
  if (verifyError) {
    console.error('TEACHER NFC VERIFY ERROR:', verifyError)
    return homeWithError(request, 'auth_failed')
  }

  await admin.from('teacher_nfc_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tag.id)
  return NextResponse.redirect(new URL('/teacher', request.url), { status: 303 })
}
