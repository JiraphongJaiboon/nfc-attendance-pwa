import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { ensureTeacherClassroom } from '@/lib/auth'
import { enumerateDates, thaiDate, thaiTime } from '@/lib/utils'
import { isIsoDate } from '@/lib/validation'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { AttendanceRow, AttendanceSession, Student } from '@/types/database'

function statusCell(student: Student, session: AttendanceSession | undefined, attendance: AttendanceRow | undefined, now: number) {
  if (!student.active) return 'ถูกระงับ'
  if (!session) return 'ไม่มีรอบ'
  if (attendance) return attendance.status === 'late' ? 'สาย' : '✓'
  if (!session.is_open || now > Date.parse(session.close_at)) return 'ปิด'
  return '–'
}

function styleWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }))
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const classroomId = params.get('classroomId') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const selectedDate = params.get('selectedDate') || from
  const auth = await ensureTeacherClassroom(classroomId)
  if ('error' in auth) return auth.error
  if (!isIsoDate(from) || !isIsoDate(to) || !isIsoDate(selectedDate) || from > to) {
    return NextResponse.json({ error: 'ช่วงวันที่ไม่ถูกต้อง' }, { status: 400 })
  }
  const dates = enumerateDates(from, to)
  if (dates.length > 93 || dates.at(-1) !== to) return NextResponse.json({ error: 'ส่งออกรายงานได้ครั้งละไม่เกิน 93 วัน' }, { status: 400 })

  const admin = createAdminSupabase()
  const [{ data: classroom }, { data: students }, { data: sessions }] = await Promise.all([
    admin.from('classrooms').select('*').eq('id', classroomId).single(),
    admin.from('students').select('*').eq('classroom_id', classroomId).order('number'),
    admin.from('attendance_sessions').select('*').eq('classroom_id', classroomId).gte('session_date', from).lte('session_date', to).order('session_date'),
  ])
  if (!classroom) return NextResponse.json({ error: 'ไม่พบห้องเรียน' }, { status: 404 })
  const sessionList = (sessions ?? []) as AttendanceSession[]
  const studentList = (students ?? []) as Student[]
  const sessionIds = sessionList.map((s) => s.id)
  let attendanceList: AttendanceRow[] = []
  if (sessionIds.length) {
    const { data } = await admin.from('attendance').select('*').eq('classroom_id', classroomId).in('session_id', sessionIds)
    attendanceList = (data ?? []) as AttendanceRow[]
  }

  const sessionByDate = new Map(sessionList.map((s) => [s.session_date, s]))
  const attendanceByKey = new Map(attendanceList.map((a) => [`${a.student_id}:${a.session_id}`, a]))
  const now = Date.now()
  const wb = XLSX.utils.book_new()

  const summaryRows = dates.map((date) => {
    const session = sessionByDate.get(date)
    const rows = session ? attendanceList.filter((a) => a.session_id === session.id) : []
    const present = rows.filter((a) => a.status === 'present').length
    const late = rows.filter((a) => a.status === 'late').length
    const activeStudents = studentList.filter((s) => s.active).length
    return {
      'ห้องเรียน': classroom.name,
      'วันที่': thaiDate(date),
      'สถานะรอบ': !session ? 'ไม่มีรอบ' : session.is_open && now <= Date.parse(session.close_at) ? 'เปิด' : 'ปิด',
      'นักเรียนที่ใช้งาน': activeStudents,
      'ตรงเวลา': present,
      'มาสาย': late,
      'เช็กชื่อแล้ว': present + late,
      'ยังไม่เช็กชื่อ': session ? Math.max(0, activeStudents - present - late) : activeStudents,
    }
  })
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  styleWidths(wsSummary, [14, 28, 14, 16, 12, 12, 14, 16])
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปการเช็กชื่อ')

  const matrixRows = studentList.map((student) => {
    const row: Record<string, string | number> = {
      'ห้องเรียน': classroom.name,
      'เลขที่': student.number,
      'รหัสนักเรียน': student.student_code,
      'ชื่อ–นามสกุล': `${student.prefix}${student.first_name} ${student.last_name}`,
    }
    for (const date of dates) {
      const session = sessionByDate.get(date)
      const attendance = session ? attendanceByKey.get(`${student.id}:${session.id}`) : undefined
      row[thaiDate(date)] = statusCell(student, session, attendance, now)
    }
    return row
  })
  const wsMatrix = XLSX.utils.json_to_sheet(matrixRows)
  styleWidths(wsMatrix, [14, 8, 16, 30, ...dates.map(() => 24)])
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'ตารางรายวัน')

  const selectedSession = sessionByDate.get(selectedDate)
  const detailRows = studentList.map((student) => {
    const att = selectedSession ? attendanceByKey.get(`${student.id}:${selectedSession.id}`) : undefined
    return {
      'ห้องเรียน': classroom.name,
      'วันที่': thaiDate(selectedDate),
      'เลขที่': student.number,
      'รหัสนักเรียน': student.student_code,
      'ชื่อ–นามสกุล': `${student.prefix}${student.first_name} ${student.last_name}`,
      'สถานะนักเรียน': student.active ? 'ใช้งาน' : 'ถูกระงับ',
      'สถานะเช็กชื่อ': statusCell(student, selectedSession, att, now),
      'เวลาเช็กชื่อ': att ? thaiTime(att.checked_at) : '',
    }
  })
  const wsDetail = XLSX.utils.json_to_sheet(detailRows)
  styleWidths(wsDetail, [14, 28, 8, 16, 30, 16, 18, 16])
  XLSX.utils.book_append_sheet(wb, wsDetail, 'รายละเอียดวันที่เลือก')

  const missingRows: Record<string, string | number>[] = []
  for (const date of dates) {
    const session = sessionByDate.get(date)
    for (const student of studentList) {
      if (!student.active) continue
      const att = session ? attendanceByKey.get(`${student.id}:${session.id}`) : undefined
      if (!att) {
        missingRows.push({
          'ห้องเรียน': classroom.name,
          'วันที่': thaiDate(date),
          'เลขที่': student.number,
          'รหัสนักเรียน': student.student_code,
          'ชื่อ–นามสกุล': `${student.prefix}${student.first_name} ${student.last_name}`,
          'สถานะ': !session ? 'ไม่มีรอบ' : !session.is_open || now > Date.parse(session.close_at) ? 'ปิด' : '–',
        })
      }
    }
  }
  const wsMissing = XLSX.utils.json_to_sheet(missingRows.length ? missingRows : [{ 'ห้องเรียน': classroom.name, 'วันที่': '', 'เลขที่': '', 'รหัสนักเรียน': '', 'ชื่อ–นามสกุล': 'ไม่มีรายการ', 'สถานะ': '' }])
  styleWidths(wsMissing, [14, 28, 8, 16, 30, 16])
  XLSX.utils.book_append_sheet(wb, wsMissing, 'ยังไม่เช็กชื่อ')

  const infoRows = [
    ['รายการ', 'ข้อมูล'],
    ['ชื่อระบบ', 'NFC Attendance PWA'],
    ['โรงเรียน', 'โรงเรียนเทศบาล ๔ (เพาะชำ)'],
    ['ห้องเรียน', classroom.name],
    ['สถานะห้อง', classroom.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'],
    ['ช่วงวันที่', `${thaiDate(from)} ถึง ${thaiDate(to)}`],
    ['วันที่รายละเอียด', thaiDate(selectedDate)],
    ['จำนวนคนปัจจุบัน', studentList.length],
    ['วันที่ออกรายงาน', new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'medium' }).format(new Date())],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows)
  styleWidths(wsInfo, [24, 50])
  XLSX.utils.book_append_sheet(wb, wsInfo, 'ข้อมูลรายงาน')

  const output = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const safeRoom = String(classroom.name).replace(/[\\/:*?"<>|]/g, '-')
  const filename = `NFC-Attendance-${safeRoom}-${from}-${to}.xlsx`
  return new NextResponse(new Uint8Array(output), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store, private',
    },
  })
}
