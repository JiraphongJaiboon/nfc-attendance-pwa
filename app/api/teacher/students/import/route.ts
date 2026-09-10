import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { ensureTeacherClassroom } from '@/lib/auth'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { studentAuthEmail } from '@/lib/student-auth'
import { normalizeStudentCode, validatePin } from '@/lib/utils'

const MAX_ROWS = 500
const MAX_FILE_BYTES = 5 * 1024 * 1024

type ImportRow = {
  classroomName: string
  number: number
  studentCode: string
  prefix: string
  firstName: string
  lastName: string
  pin: string
}

function text(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

export async function POST(request: Request) {
  const form = await request.formData()
  const classroomId = text(form.get('classroomId'))
  const file = form.get('file')
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  if (!(file instanceof File)) return NextResponse.json({ error: 'กรุณาเลือกไฟล์ Excel, XLS หรือ CSV' }, { status: 400 })
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 5 MB' }, { status: 400 })
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ .xlsx .xls และ .csv' }, { status: 400 })

  const admin = createAdminSupabase()
  const { data: classroom } = await admin.from('classrooms').select('name,is_active').eq('id', classroomId).single()
  if (!classroom?.is_active) return NextResponse.json({ error: 'ห้องเรียนถูกปิดใช้งาน ไม่สามารถนำเข้านักเรียนได้' }, { status: 409 })

  let workbook: XLSX.WorkBook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', raw: false })
  } catch {
    return NextResponse.json({ error: 'อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์' }, { status: 400 })
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return NextResponse.json({ error: 'ไม่พบข้อมูลในไฟล์' }, { status: 400 })
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  if (!records.length) return NextResponse.json({ error: 'ไฟล์ไม่มีรายชื่อนักเรียน' }, { status: 400 })
  if (records.length > MAX_ROWS) return NextResponse.json({ error: `นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS} คน` }, { status: 400 })

  const rows: ImportRow[] = []
  const errors: string[] = []
  records.forEach((r, index) => {
    const rowNo = index + 2
    const number = Number(text(r['เลขที่']))
    const studentCode = normalizeStudentCode(text(r['รหัสนักเรียน']))
    const prefix = text(r['คำนำหน้า'])
    const firstName = text(r['ชื่อ'])
    const lastName = text(r['นามสกุล'])
    const pin = text(r['PIN'])
    const classroomName = text(r['ห้องเรียน'])
    if (!Number.isInteger(number) || number <= 0) errors.push(`แถว ${rowNo}: เลขที่ไม่ถูกต้อง`)
    if (!studentCode) errors.push(`แถว ${rowNo}: ไม่มีรหัสนักเรียน`)
    if (!firstName || !lastName) errors.push(`แถว ${rowNo}: ชื่อหรือนามสกุลไม่ครบ`)
    if (!validatePin(pin)) errors.push(`แถว ${rowNo}: PIN ต้องเป็นตัวเลขอย่างน้อย 6 ตัว`)
    if (classroomName && classroomName !== classroom.name) errors.push(`แถว ${rowNo}: ระบุห้อง “${classroomName}” แต่ห้องปลายทางคือ “${classroom.name}”`)
    rows.push({ classroomName, number, studentCode, prefix, firstName, lastName, pin })
  })

  const duplicateCodes = rows.filter((r, i) => rows.findIndex((x) => x.studentCode === r.studentCode) !== i).map((r) => r.studentCode)
  const duplicateNumbers = rows.filter((r, i) => rows.findIndex((x) => x.number === r.number) !== i).map((r) => r.number)
  if (duplicateCodes.length) errors.push(`รหัสนักเรียนซ้ำในไฟล์: ${[...new Set(duplicateCodes)].join(', ')}`)
  if (duplicateNumbers.length) errors.push(`เลขที่ซ้ำในไฟล์: ${[...new Set(duplicateNumbers)].join(', ')}`)
  if (errors.length) return NextResponse.json({ error: errors.slice(0, 30).join('\n') }, { status: 400 })

  const codes = rows.map((r) => r.studentCode)
  const numbers = rows.map((r) => r.number)
  const [{ data: existingCodes }, { data: existingNumbers }] = await Promise.all([
    admin.from('students').select('student_code').in('student_code', codes),
    admin.from('students').select('number').eq('classroom_id', classroomId).in('number', numbers),
  ])
  if (existingCodes?.length) return NextResponse.json({ error: `มีรหัสนักเรียนในระบบแล้ว: ${existingCodes.map((x) => x.student_code).join(', ')}` }, { status: 409 })
  if (existingNumbers?.length) return NextResponse.json({ error: `มีเลขที่ในห้องแล้ว: ${existingNumbers.map((x) => x.number).join(', ')}` }, { status: 409 })

  const createdIds: string[] = []
  try {
    for (const row of rows) {
      const displayName = `${row.prefix}${row.firstName} ${row.lastName}`.trim()
      const { data: created, error: authError } = await admin.auth.admin.createUser({
        email: studentAuthEmail(row.studentCode),
        password: row.pin,
        email_confirm: true,
        user_metadata: { role: 'student', display_name: displayName, student_code: row.studentCode },
      })
      if (authError || !created.user) throw new Error(`สร้างบัญชีของ ${row.studentCode} ไม่สำเร็จ`)
      createdIds.push(created.user.id)
      const { error: profileError } = await admin.from('profiles').upsert({ id: created.user.id, role: 'student', display_name: displayName })
      if (profileError) throw new Error(`สร้างโปรไฟล์ของ ${row.studentCode} ไม่สำเร็จ`)
      const { error: studentError } = await admin.from('students').insert({
        id: created.user.id,
        classroom_id: classroomId,
        student_code: row.studentCode,
        number: row.number,
        prefix: row.prefix,
        first_name: row.firstName,
        last_name: row.lastName,
        active: true,
      })
      if (studentError) throw new Error(`บันทึกข้อมูลของ ${row.studentCode} ไม่สำเร็จ`)
    }
  } catch (error) {
    for (const userId of createdIds.reverse()) await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: error instanceof Error ? `${error.message} ระบบยกเลิกรายการที่สร้างในครั้งนี้แล้ว` : 'นำเข้าไม่สำเร็จ' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, imported: rows.length, classroom: classroom.name })
}
