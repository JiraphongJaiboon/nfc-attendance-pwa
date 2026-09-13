import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { StudentNav } from '@/components/student-nav'
import { OrthographicGame } from '@/components/orthographic-game'

export const dynamic = 'force-dynamic'

export default async function StudentGamePage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/game')
  if (profile?.role !== 'student') redirect('/')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <StudentNav active="game" />
      <OrthographicGame />
    </div>
  </main>
}
