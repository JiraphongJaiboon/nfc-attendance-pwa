import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { StudentQuizRunner } from '@/components/student-quiz-runner'

export const dynamic = 'force-dynamic'

export default async function StudentQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/quizzes')
  if (profile?.role !== 'student') redirect('/student/login?next=/student/quizzes')
  const { id } = await params

  return <main className="student-content">
    <div className="student-content-inner stack">
      <a className="btn btn-secondary btn-sm" href="/student/quizzes" style={{ width: 'fit-content' }}>← กลับรายการแบบทดสอบ</a>
      <StudentQuizRunner quizId={id} />
    </div>
  </main>
}
