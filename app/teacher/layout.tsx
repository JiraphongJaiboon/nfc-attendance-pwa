import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { TeacherShell } from '@/components/teacher-shell'
import type { Classroom } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/')
  if (profile?.role !== 'teacher') redirect('/')

  const admin = createAdminSupabase()
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    admin.from('classrooms').select('id').eq('teacher_id', user.id),
    admin.from('classroom_teachers').select('classroom_id').eq('teacher_id', user.id),
  ])
  const ids = [...new Set([...(owned ?? []).map((row) => row.id), ...(memberships ?? []).map((row) => row.classroom_id)])]
  let classrooms: Classroom[] = []
  if (ids.length) {
    const { data } = await admin.from('classrooms').select('*').in('id', ids).order('name')
    classrooms = (data ?? []) as Classroom[]
  }

  return <TeacherShell initialClassrooms={classrooms} displayName={profile.display_name}>{children}</TeacherShell>
}
