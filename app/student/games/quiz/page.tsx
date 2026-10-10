import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { ProjectionQuizGame } from '@/components/projection-quiz-game'

export const dynamic = 'force-dynamic'

export default async function ProjectionQuizPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/games/quiz')
  if (profile?.role !== 'student') redirect('/student/login?next=/student/games/quiz')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <div className="row">
        <a className="btn btn-secondary btn-sm" href="/student/games">← เลือกเกม</a>
        <a className="btn btn-ghost btn-sm" href="/student/materials">สื่อการสอน</a>
      </div>
      <ProjectionQuizGame />
    </div>
  </main>
}
