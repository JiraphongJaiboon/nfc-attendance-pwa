import { NextResponse } from 'next/server'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { studentAuthEmail } from '@/lib/student-auth'
import { asPositiveInt, asString } from '@/lib/validation'
import { normalizeStudentCode, validatePin } from '@/lib/utils'

export async function GET(request: Request) {
  const classroomId = new URL(request.url).searchParams.get('classroomId') ?? ''
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error

  const admin = createAdminSupabase()
  const { data: students, error } = await admin
    .from('students')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('number')

  if (error) {
    console.error('LOAD STUDENTS ERROR:', error)
    return NextResponse.json({ error: `โหลดรายชื่อนักเรียนไม่สำเร็จ: ${error.message}` }, { status: 500 })
  }

  const ids = (students ?? []).map((s) => s.id)
  let tokenRows: { student_id: string; status: 'active' | 'revoked' }[] = []
  if (ids.length) {
    const { data, error: tokenError } = await admin
      .from('nfc_tokens')
      .select('student_id,status,issued_at')
      .in('student_id', ids)
      .order('issued_at', { ascending: false })
    if (tokenError) console.error('LOAD NFC TOKENS ERROR:', tokenError)
    tokenRows = (data ?? []) as typeof tokenRows
  }

  const tokenMap = new Map<string, 'active' | 'revoked'>()
  for (const token of tokenRows) if (!tokenMap.has(token.student_id)) tokenMap.set(token.student_id, token.status)

  return NextResponse.json({ students: (students ?? []).map((s) => ({ ...s, nfc_status: tokenMap.get(s.id) ?? 'none' })) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const classroomId = asString(body.classroomId, 100)
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  const studentCode = normalizeStudentCode(asString(body.studentCode, 50))
  const number = asPositiveInt(body.number)
  const prefix = asString(body.prefix, 30)
  const firstName = asString(body.firstName, 100)
  const lastName = asString(body.lastName, 100)
  const pin = String(body.pin ?? '')
  if (!studentCode || !number || !firstName || !lastName || !validatePin(pin)) {
    return NextResponse.json({ error: 'กรอกข้อมูลให้ครบ และ PIN ต้องเป็นตัวเลขอย่างน้อย 6 ตัว' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data: duplicateCode } = await admin.from('students').select('id').eq('student_code', studentCode).maybeSingle()
  if (duplicateCode) return NextResponse.json({ error: 'รหัสนักเรียนนี้มีอยู่ในระบบแล้ว' }, { status: 409 })
  const { data: duplicateNumber } = await admin.from('students').select('id').eq('classroom_id', classroomId).eq('number', number).maybeSingle()
  if (duplicateNumber) return NextResponse.json({ error: 'เลขที่นี้มีอยู่ในห้องแล้ว' }, { status: 409 })

  const displayName = `${prefix}${firstName} ${lastName}`.trim()
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: studentAuthEmail(studentCode),
    password: pin,
    email_confirm: true,
    user_metadata: { role: 'student', display_name: displayName, student_code: studentCode },
  })
  if (authError || !authUser.user) return NextResponse.json({ error: 'สร้างบัญชีนักเรียนไม่สำเร็จ' }, { status: 500 })

  const userId = authUser.user.id
  const { error: profileError } = await admin.from('profiles').upsert({ id: userId, role: 'student', display_name: displayName })
  const { data: student, error: studentError } = await admin.from('students').insert({
    id: userId,
    classroom_id: classroomId,
    student_code: studentCode,
    number,
    prefix,
    first_name: firstName,
    last_name: lastName,
    active: true,
  }).select('*').single()

  if (profileError || studentError) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: studentError?.code === '23505' ? 'ข้อมูลนักเรียนซ้ำในระบบ' : 'บันทึกข้อมูลนักเรียนไม่สำเร็จ' }, { status: 500 })
  }
  return NextResponse.json({ student }, { status: 201 })
}
