'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'
import { apiFetch } from '@/lib/api'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { bangkokDateNow, enumerateDates, thaiDate, thaiTime } from '@/lib/utils'
import type { AttendanceRow, AttendanceSession, DashboardPayload, Student } from '@/types/database'

function addDays(date: string, count: number) {
  const d = new Date(`${date}T12:00:00+07:00`)
  d.setDate(d.getDate() + count)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function monthEnd(date: string) {
  const [y,m] = date.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

export function Dashboard() {
  const { selectedId, selectedClassroom, reloadClassrooms } = useClassroom()
  const today = bangkokDateNow()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [realtime, setRealtime] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  const load = useCallback(async () => {
    if (!selectedId) { setData(null); return }
    setLoading(true); setError(''); setData(null)
    try {
      const result = await apiFetch<DashboardPayload>(`/api/teacher/dashboard?classroomId=${encodeURIComponent(selectedId)}&from=${from}&to=${to}`)
      setData(result)
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [selectedId, from, to])

  useEffect(() => { void load() }, [load])

useEffect(() => {
  if (!selectedId) return

  const supabase = createBrowserSupabase()

  setRealtime(false)

  const channel = supabase
    .channel(`attendance-classroom-${selectedId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance',
        filter: `classroom_id=eq.${selectedId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new as unknown as AttendanceRow

        setData((current) => {
          if (!current) return current

          if (current.classroom.id !== selectedId) {
            return current
          }

          const sessionExists = current.sessions.some(
            (session) => session.id === row.session_id
          )

          if (!sessionExists) {
            return current
          }

          const attendanceExists = current.attendance.some(
            (attendance) => attendance.id === row.id
          )

          if (attendanceExists) {
            return current
          }

          return {
            ...current,
            attendance: [
              row,
              ...current.attendance,
            ],
          }
        })
      }
    )
    .subscribe((status: string) => {
      setRealtime(status === 'SUBSCRIBED')
    })

  return () => {
    setRealtime(false)

    void supabase.removeChannel(channel)
  }
}, [selectedId])

  const dates = useMemo(() => enumerateDates(from, to), [from, to])
  const sessionMap = useMemo(() => new Map((data?.sessions ?? []).map((s) => [s.session_date, s])), [data])
  const attendanceMap = useMemo(() => new Map((data?.attendance ?? []).map((a) => [`${a.student_id}:${a.session_id}`, a])), [data])
  const selectedSession = sessionMap.get(selectedDate)
  const selectedAttendance = useMemo(() => selectedSession ? (data?.attendance ?? []).filter((a) => a.session_id === selectedSession.id) : [], [data, selectedSession])
  const activeStudents = (data?.students ?? []).filter((s) => s.active)
  const present = selectedAttendance.filter((a) => a.status === 'present').length
  const late = selectedAttendance.filter((a) => a.status === 'late').length
  const missing = Math.max(0, activeStudents.length - present - late)
  const studentMap = useMemo(() => new Map((data?.students ?? []).map((s) => [s.id, s])), [data])
  const latest = [...selectedAttendance].sort((a,b) => Date.parse(b.checked_at) - Date.parse(a.checked_at)).slice(0, 8)

  function preset(type: 'today'|'week'|'month') {
    if (type === 'today') { setFrom(today); setTo(today); setSelectedDate(today); return }
    if (type === 'week') {
      const day = new Date(`${today}T12:00:00+07:00`).getDay() || 7
      const start = addDays(today, 1-day)
      setFrom(start); setTo(addDays(start, 6)); setSelectedDate(today)
      return
    }
    const start = `${today.slice(0,7)}-01`
    setFrom(start); setTo(monthEnd(today)); setSelectedDate(today)
  }

  async function toggleClassroom() {
    if (!selectedClassroom) return
    if (!confirm(`${selectedClassroom.is_active ? 'ปิด' : 'เปิด'}ใช้งานห้อง ${selectedClassroom.name} ?`)) return
    try {
      await apiFetch(`/api/teacher/classrooms/${selectedClassroom.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !selectedClassroom.is_active }) })
      await reloadClassrooms(); await load()
    } catch (e) { alert(e instanceof Error ? e.message : 'แก้ไขสถานะห้องไม่สำเร็จ') }
  }

  if (!selectedId || !selectedClassroom) return <div className="card empty"><h2>ยังไม่มีห้องเรียน</h2><p>ไปที่ “จัดการห้องเรียน” เพื่อสร้างห้องแรกก่อนใช้งานตารางเช็กชื่อ</p></div>

  return <>
    <div className="header-row">
      <div><h1 className="page-title">ตารางเช็กชื่อ — {selectedClassroom.name}</h1><p className="page-subtitle">ข้อมูลเฉพาะห้องที่เลือก · วันที่ตามประเทศไทย (Asia/Bangkok)</p></div>
      <div className="row">
        <span className={`badge ${selectedClassroom.is_active ? 'badge-green' : 'badge-red'}`}>สถานะห้อง: {selectedClassroom.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
        <span className="badge badge-green"><span className="realtime-dot" /> Realtime {realtime ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ'}</span>
        <button className={`btn btn-sm ${selectedClassroom.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={toggleClassroom}>{selectedClassroom.is_active ? 'ปิดห้อง' : 'เปิดห้อง'}</button>
      </div>
    </div>

    <div className="card toolbar">
      <div className="row">
        <button className="btn btn-secondary btn-sm" onClick={() => preset('today')}>วันนี้</button>
        <button className="btn btn-secondary btn-sm" onClick={() => preset('week')}>สัปดาห์นี้</button>
        <button className="btn btn-secondary btn-sm" onClick={() => preset('month')}>เดือนนี้</button>
      </div>
      <label>จากวันที่<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (selectedDate < e.target.value) setSelectedDate(e.target.value) }} /></label>
      <label>ถึงวันที่<input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); if (selectedDate > e.target.value) setSelectedDate(e.target.value) }} /></label>
      <label>วันที่ที่ดูรายละเอียด<input type="date" value={selectedDate} min={from} max={to} onChange={(e) => setSelectedDate(e.target.value)} /></label>
      <button className="btn btn-orange" onClick={() => setEditorOpen(true)} disabled={!selectedClassroom.is_active}>{selectedSession ? 'แก้ไขรอบวันที่เลือก' : 'สร้างรอบวันที่เลือก'}</button>
      <button className="btn btn-secondary" onClick={load}>โหลดใหม่</button>
    </div>

    {error && <div className="message message-error">{error}</div>}
    {loading && <div className="card loading">กำลังโหลดข้อมูลเฉพาะห้อง {selectedClassroom.name}…</div>}
    {data && <>
      <div className="stats">
        <div className="stat-card"><div className="stat-label">นักเรียนในห้อง</div><div className="stat-value">{data.students.length}</div></div>
        <div className="stat-card stat-present"><div className="stat-label">ตรงเวลา · {thaiDate(selectedDate, false)}</div><div className="stat-value">{present}</div></div>
        <div className="stat-card stat-late"><div className="stat-label">มาสาย</div><div className="stat-value">{late}</div></div>
        <div className="stat-card stat-missing"><div className="stat-label">ยังไม่เช็กชื่อ</div><div className="stat-value">{missing}</div></div>
      </div>

      <div className="card session-panel">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div><strong>รอบวันที่เลือก: {thaiDate(selectedDate)}</strong><div className="muted" style={{marginTop:5}}>{selectedSession ? `เปิดรับ ${localTime(selectedSession.open_at)} น. · ตรงเวลาถึง ${localTime(selectedSession.on_time_until)} น. · ปิดรับ ${localTime(selectedSession.close_at)} น. · ${selectedSession.allow_late ? 'อนุญาตมาสาย' : 'ไม่อนุญาตมาสาย'}` : 'ยังไม่ได้สร้างรอบเช็กชื่อของวันนี้สำหรับห้องนี้'}</div></div>
          <span className={`badge ${selectedSession?.is_open ? 'badge-green' : 'badge-red'}`}>สถานะรอบ: {selectedSession ? (selectedSession.is_open ? 'เปิด' : 'ปิด') : 'ไม่มีรอบ'}</span>
        </div>
      </div>

      <div className="table-wrap" aria-label={`ตารางเช็กชื่อห้อง ${selectedClassroom.name}`}>
        <table>
          <thead><tr><th className="sticky-1" style={{minWidth:74}}>เลขที่</th><th className="sticky-2" style={{minWidth:150}}>รหัสนักเรียน</th><th style={{minWidth:230}}>ชื่อ–นามสกุล</th>{dates.map((date) => <th key={date} className={`date-head ${selectedDate === date ? 'date-selected' : ''}`}><button onClick={() => setSelectedDate(date)}>{thaiDate(date, false)}</button></th>)}</tr></thead>
          <tbody>{data.students.map((student) => <tr key={student.id}><td className="sticky-1">{student.number}</td><td className="sticky-2">{student.student_code}</td><td>{student.prefix}{student.first_name} {student.last_name}{!student.active && <> <span className="badge badge-red">ถูกระงับ</span></>}</td>{dates.map((date) => <AttendanceCell key={date} student={student} session={sessionMap.get(date)} attendance={sessionMap.get(date) ? attendanceMap.get(`${student.id}:${sessionMap.get(date)!.id}`) : undefined} expired={sessionMap.get(date) ? Date.parse(data.serverNow) > Date.parse(sessionMap.get(date)!.close_at) : false} />)}</tr>)}</tbody>
        </table>
      </div>

      <div className="grid-2" style={{marginTop:14}}>
        <section className="card"><h3 style={{marginTop:0}}>ผู้เช็กชื่อล่าสุด · {thaiDate(selectedDate, false)}</h3>{latest.length ? <div className="list">{latest.map((a) => { const s = studentMap.get(a.student_id); return <div className="list-item" key={a.id}><span>{s ? `${s.number}. ${s.prefix}${s.first_name} ${s.last_name}` : a.student_id}</span><span className={`badge ${a.status === 'late' ? 'badge-orange':'badge-green'}`}>{a.status === 'late' ? 'สาย' : '✓'} · {thaiTime(a.checked_at)}</span></div> })}</div> : <div className="empty">ยังไม่มีผู้เช็กชื่อในวันที่เลือก</div>}</section>
        <section className="card"><h3 style={{marginTop:0}}>คำอธิบายสถานะ</h3><div className="stack"><span><b style={{color:'var(--green)'}}>✓</b> = เช็กชื่อแล้วและตรงเวลา</span><span><b style={{color:'var(--yellow)'}}>สาย</b> = เช็กชื่อหลังเวลาตรงเวลา</span><span><b>–</b> = ยังไม่เช็กชื่อและรอบยังรับอยู่</span><span><b style={{color:'var(--red)'}}>ปิด</b> = รอบปิดหรือหมดเวลา</span><span><b>ไม่มีรอบ</b> = ยังไม่ได้สร้างรอบวันนั้น</span></div></section>
      </div>
    </>}

    {editorOpen && <SessionEditor session={selectedSession} classroomId={selectedId} date={selectedDate} onClose={() => setEditorOpen(false)} onSaved={async () => { setEditorOpen(false); await load() }} />}
  </>
}

function AttendanceCell({ student, session, attendance, expired }: { student: Student; session?: AttendanceSession; attendance?: AttendanceRow; expired: boolean }) {
  let label = '–', cls = 'cell-missing'
  if (!student.active) { label = 'ถูกระงับ'; cls = 'cell-suspended' }
  else if (!session) { label = 'ไม่มีรอบ'; cls = 'cell-none' }
  else if (attendance?.status === 'present') { label = '✓'; cls = 'cell-present' }
  else if (attendance?.status === 'late') { label = 'สาย'; cls = 'cell-late' }
  else if (!session.is_open || expired) { label = 'ปิด'; cls = 'cell-closed' }
  return <td className={`cell-status ${cls}`}>{attendance ? <button className="clickable-cell" title="ดูเวลาเช็กชื่อ" onClick={() => alert(`เวลาเช็กชื่อ: ${thaiTime(attendance.checked_at)} น.\nสถานะ: ${attendance.status === 'late' ? 'มาสาย' : 'ตรงเวลา'}`)}>{label}</button> : label}</td>
}

function SessionEditor({ session, classroomId, date, onClose, onSaved }: { session?: AttendanceSession; classroomId: string; date: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('')
    const f = new FormData(e.currentTarget)
    const body = { classroomId, date, openTime: f.get('openTime'), onTimeUntil: f.get('onTimeUntil'), closeTime: f.get('closeTime'), allowLate: f.get('allowLate') === 'on', isOpen: f.get('isOpen') === 'on' }
    try {
      if (session) await apiFetch(`/api/teacher/sessions/${session.id}`, { method:'PATCH', body: JSON.stringify(body) })
      else await apiFetch('/api/teacher/sessions', { method:'POST', body: JSON.stringify(body) })
      await onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกรอบไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal stack">
    <div><h2 style={{margin:'0 0 4px'}}>{session ? 'แก้ไขรอบเช็กชื่อ' : 'สร้างรอบเช็กชื่อ'}</h2><div className="muted">{thaiDate(date)} · ห้องปัจจุบัน</div></div>
    <form className="stack" onSubmit={submit}>
      <div className="grid-3">
        <label>เวลาเปิดรับ<input name="openTime" type="text" inputMode="numeric" placeholder="07:45" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} required defaultValue={session ? localTime(session.open_at) : '07:45'} title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 07:45" /></label>
        <label>ตรงเวลาถึง<input name="onTimeUntil" type="text" inputMode="numeric" placeholder="08:00" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} required defaultValue={session ? localTime(session.on_time_until) : '08:00'} title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 08:00" /></label>
        <label>เวลาปิดรับ<input name="closeTime" type="text" inputMode="numeric" placeholder="08:15" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} required defaultValue={session ? localTime(session.close_at) : '08:15'} title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 08:15" /></label>
      </div>
      <label style={{display:'flex', gridAutoFlow:'column', justifyContent:'start', alignItems:'center'}}><input name="allowLate" type="checkbox" defaultChecked={session?.allow_late ?? true} style={{width:20,minHeight:20}} /> อนุญาตให้นักเรียนเช็กชื่อสาย</label>
      <label style={{display:'flex', gridAutoFlow:'column', justifyContent:'start', alignItems:'center'}}><input name="isOpen" type="checkbox" defaultChecked={session?.is_open ?? true} style={{width:20,minHeight:20}} /> เปิดรอบรับเช็กชื่อ</label>
      {error && <div className="message message-error">{error}</div>}
      <div className="row" style={{justifyContent:'flex-end'}}><button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" disabled={loading}>{loading ? 'กำลังบันทึก…' : 'บันทึก'}</button></div>
    </form>
  </div></div>
}
