import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TeacherLoginForm } from '@/components/teacher-login-form'

export const dynamic = 'force-dynamic'

const teacherNfcMessages: Record<string, string> = {
  invalid: 'ไม่พบ NFC ครูนี้ในระบบ หรือ URL ไม่ถูกต้อง',
  revoked: 'NFC ครูนี้ถูกยกเลิกแล้ว',
  not_teacher: 'บัญชีเจ้าของแท็กไม่มีสิทธิ์ครู',
  auth_failed: 'เข้าสู่ระบบด้วย NFC ครูไม่สำเร็จ กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน',
}

export default async function Home({ searchParams }: { searchParams?: Promise<{ teacherNfcError?: string }> }) {
  const params = searchParams ? await searchParams : {}
  const teacherNfcError = params.teacherNfcError ? teacherNfcMessages[params.teacherNfcError] : ''
  const { user, profile } = await getCurrentUser()
  if (user && profile?.role === 'teacher') redirect('/teacher')
  if (user && profile?.role === 'student') redirect('/student')
  return <main className="page-center"><section className="login-card stack">
    <div className="brand-mark">NFC</div>
    <div><h1 className="brand-title">NFC Attendance PWA</h1><p className="muted">โรงเรียนเทศบาล ๔ (เพาะชำ) · ระบบเช็กชื่อด้วย NFC แยกตามห้องเรียน</p></div>
    {teacherNfcError && <div className="message message-error">{teacherNfcError}</div>}
    <TeacherLoginForm />
    <hr />
    <p className="muted" style={{margin: 0}}>นักเรียนไม่ต้องเปิดหน้านี้ ให้แตะ NFC Tag ประจำตัว หากยังไม่เคยเข้าสู่ระบบ ระบบจะพาไปหน้ากรอกรหัสนักเรียนและ PIN อัตโนมัติ</p>
  </section></main>
}
