import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { StudentMaterials } from '@/components/student-materials'
import { StudentNav } from '@/components/student-nav'

export const dynamic = 'force-dynamic'

export default async function StudentMaterialsPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/materials')
  if (profile?.role !== 'student') redirect('/')
  return <main className="student-content"><div className="student-content-inner stack"><StudentNav active="materials" /><StudentMaterials /></div></main>
}
