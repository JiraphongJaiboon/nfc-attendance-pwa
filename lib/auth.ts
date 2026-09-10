import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

export async function requireTeacherApi() {
  const ctx = await getCurrentUser()
  if (!ctx.user) return { error: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบครู' }, { status: 401 }) }
  if (ctx.profile?.role !== 'teacher') {
    return { error: NextResponse.json({ error: 'บัญชีนี้ไม่มีสิทธิ์ครู' }, { status: 403 }) }
  }
  return ctx
}

export async function ensureTeacherClassroom(classroomId: string) {
  const auth = await requireTeacherApi()
  if ('error' in auth) return auth
  const { data: allowed } = await auth.supabase.rpc('teacher_can_access_classroom', {
    p_classroom_id: classroomId,
  })
  if (!allowed) {
    return { error: NextResponse.json({ error: 'ผู้ใช้ไม่มีสิทธิ์เข้าถึงห้องนี้' }, { status: 403 }) }
  }
  return auth
}
