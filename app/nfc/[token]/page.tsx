import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { NfcCheckin } from '@/components/nfc-checkin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NfcPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { user } = await getCurrentUser()
  if (!user) redirect(`/student/login?next=${encodeURIComponent(`/nfc/${token}`)}`)
  return <main className="page-center"><section className="login-card"><NfcCheckin token={token} /></section></main>
}
