import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
      return NextResponse.json({ ok: false, code: 'INVALID_TAG', message: 'ลิงก์ NFC ไม่ถูกต้อง' }, { status: 400 })
    }
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, code: 'NOT_AUTHENTICATED', message: 'กรุณาเข้าสู่ระบบนักเรียนก่อน' }, { status: 401 })
    const { data, error } = await supabase.rpc('check_in_by_nfc', { p_token: token })
    if (error) return NextResponse.json({ ok: false, code: 'SYSTEM_ERROR', message: 'ระบบหรือเครือข่ายขัดข้อง' }, { status: 500 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, private' } })
  } catch {
    return NextResponse.json({ ok: false, code: 'NETWORK_ERROR', message: 'ระบบหรือเครือข่ายขัดข้อง' }, { status: 500 })
  }
}
