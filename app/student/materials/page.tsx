import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { StudentMaterials } from '@/components/student-materials'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function StudentMaterialsPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/materials')
 if (profile?.role !== 'student') {
  redirect('/student/login?next=/student/materials')
}
  return <main className="student-content"><div className="student-content-inner stack"><div className="row" style={{ justifyContent: 'space-between' }}><a className="btn btn-orange btn-sm" href="https://phoachum-learning-games.vercel.app/" target="_blank" rel="noopener noreferrer">🎮 เล่นเกม</a><a className="btn btn-primary btn-sm" href="/student/quizzes">📝 แบบทดสอบ</a><LogoutButton /></div><StudentMaterials /></div></main>
}
