import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'
import { StudentQuizList } from '@/components/student-quiz-list'

export const dynamic = 'force-dynamic'

export default async function StudentQuizzesPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/quizzes')
  if (profile?.role !== 'student') redirect('/student/login?next=/student/quizzes')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <a className="btn btn-secondary btn-sm" href="/student/materials">← สื่อการสอน</a>
          <a className="btn btn-orange btn-sm" href="https://phoachum-learning-games.vercel.app/" target="_blank" rel="noopener noreferrer">🎮 เกม</a>
        </div>
        <LogoutButton />
      </div>
      <StudentQuizList />
    </div>
  </main>
}
