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
  return <main className="student-content"><div className="student-content-inner stack"><div className="row" style={{ justifyContent: 'flex-end' }}><LogoutButton /></div><StudentMaterials /></div></main>
}
