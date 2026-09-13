import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SolidLabStudent } from '@/components/solidlab/solidlab-student'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'
export default async function StudentLabPage(){
  const {user,profile}=await getCurrentUser()
  if(!user) redirect('/student/login?next=/student/lab')
  if(profile?.role!=='student') redirect('/')
  return <main className="student-content"><div className="student-content-inner stack"><div className="row" style={{justifyContent:'flex-end'}}><LogoutButton/></div><SolidLabStudent/></div></main>
}
