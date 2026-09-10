import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { studentAuthEmail } from '@/lib/student-auth'
import { normalizeStudentCode, validatePin } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { studentCode, pin } = await request.json()
    const code = normalizeStudentCode(String(studentCode ?? ''))
    const pinText = String(pin ?? '')
    if (!code || !validatePin(pinText)) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสนักเรียนและ PIN อย่างน้อย 6 ตัว' }, { status: 400 })
    }
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: studentAuthEmail(code),
      password: pinText,
    })
    if (error || !data.user) return NextResponse.json({ error: 'รหัสนักเรียนหรือ PIN ไม่ถูกต้อง' }, { status: 401 })
    const { data: student } = await supabase
      .from('students')
      .select('student_code, active')
      .eq('id', data.user.id)
      .maybeSingle()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (!student || profile?.role !== 'student' || student.student_code !== code) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'บัญชีนี้ไม่ใช่บัญชีนักเรียนที่ถูกต้อง' }, { status: 403 })
    }
    if (!student.active) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'นักเรียนถูกระงับ กรุณาติดต่อครู' }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'ระบบหรือเครือข่ายขัดข้อง' }, { status: 500 })
  }
}
