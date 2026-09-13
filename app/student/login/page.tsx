import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { safeNextPath } from '@/lib/utils'
import { StudentLoginForm } from '@/components/student-login-form'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function StudentLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const query = await searchParams
  const nextPath = safeNextPath(query.next ?? null)
  const { user, profile } = await getCurrentUser()
  if (user && profile?.role === 'student') redirect(nextPath)
  return <main className="page-center"><section className="login-card stack">
    <div className="brand-mark">✓</div>
    <div><h1 className="brand-title">เข้าสู่ระบบนักเรียน</h1><p className="muted">เข้าสู่ระบบครั้งแรกด้วยรหัสนักเรียนและ PIN จากครู จากนั้นโทรศัพท์จะจดจำ Session ไว้</p></div>
    {user && <div className="message message-error">ขณะนี้มีบัญชีประเภทอื่นเข้าสู่ระบบอยู่ กรุณาออกจากระบบก่อนแล้วแตะ NFC ใหม่</div>}
    {!user && <StudentLoginForm nextPath={nextPath} />}
    {user && <LogoutButton />}
  </section></main>
}
