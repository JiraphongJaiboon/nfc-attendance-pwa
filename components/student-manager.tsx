'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useClassroom } from '@/components/teacher-shell'
import { apiFetch } from '@/lib/api'
import type { Student } from '@/types/database'

export function StudentManager() {
  const { selectedId, selectedClassroom, classrooms, reloadClassrooms } = useClassroom()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nfcUrl, setNfcUrl] = useState('')
  const [editStudent, setEditStudent] = useState<Student | null>(null)

  const load = useCallback(async () => {
    if (!selectedId) { setStudents([]); return }
    setStudents([]); setLoading(true); setError('')
    try { const data = await apiFetch<{ students: Student[] }>(`/api/teacher/students?classroomId=${encodeURIComponent(selectedId)}`); setStudents(data.students) }
    catch (e) { setError(e instanceof Error ? e.message : 'โหลดรายชื่อไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [selectedId])
  useEffect(() => { void load() }, [load])

  async function addStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')
    const formElement = e.currentTarget
    const f = new FormData(formElement)
    try {
      await apiFetch('/api/teacher/students', {
        method: 'POST',
        body: JSON.stringify({
          classroomId: selectedId,
          number: f.get('number'),
          studentCode: f.get('studentCode'),
          prefix: f.get('prefix'),
          firstName: f.get('firstName'),
          lastName: f.get('lastName'),
          pin: f.get('pin'),
        }),
      })
      formElement.reset()
      await load()
      await reloadClassrooms()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'เพิ่มนักเรียนไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function importFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedId) return
    const formElement = e.currentTarget
    const f = new FormData(formElement)
    f.set('classroomId', selectedId)
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ imported:number; classroom:string }>('/api/teacher/students/import', { method:'POST', body:f })
      alert(`นำเข้าสำเร็จ ${data.imported} คน ไปยังห้อง ${data.classroom}`)
      formElement.reset()
      await load()
      await reloadClassrooms()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function issue(student: Student) {
    if (!confirm(`ออกลิงก์ NFC ใหม่ให้ ${student.first_name} ${student.last_name} ?\nหากมีลิงก์เดิม ลิงก์เดิมจะใช้ไม่ได้ทันที`)) return
    try { const data = await apiFetch<{url:string}>('/api/teacher/nfc/issue', { method:'POST', body:JSON.stringify({studentId:student.id}) }); setNfcUrl(data.url); await load() }
    catch (e) { alert(e instanceof Error ? e.message : 'สร้างลิงก์ไม่สำเร็จ') }
  }
  async function revoke(student: Student) {
    if (!confirm(`ยกเลิก NFC Tag ของ ${student.first_name} ${student.last_name} ?`)) return
    try { await apiFetch('/api/teacher/nfc/revoke', { method:'POST', body:JSON.stringify({studentId:student.id}) }); await load() }
    catch (e) { alert(e instanceof Error ? e.message : 'ยกเลิกแท็กไม่สำเร็จ') }
  }
  async function toggleStudent(student: Student) {
    try { await apiFetch(`/api/teacher/students/${student.id}`, { method:'PATCH', body:JSON.stringify({active:!student.active}) }); await load() }
    catch (e) { alert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ') }
  }

  if (!selectedClassroom) return <div className="card empty">กรุณาสร้างและเลือกห้องเรียนก่อนเพิ่มนักเรียน</div>
  return <>
    <div className="header-row"><div><h1 className="page-title">นักเรียนและ NFC — {selectedClassroom.name}</h1><p className="page-subtitle">นักเรียนทุกคนในหน้านี้สังกัดห้องที่เลือกเท่านั้น · รหัสนักเรียนบังคับไม่ซ้ำทั้งระบบ</p></div><a className="btn btn-secondary" href="/templates/student-import-template.xlsx" download>ดาวน์โหลด Excel ตัวอย่าง</a></div>
    {!selectedClassroom.is_active && <div className="message message-error">ห้องนี้ปิดใช้งานอยู่ ควรเปิดห้องก่อนเพิ่มนักเรียนหรือออกแท็กใหม่</div>}
    {error && <div className="message message-error">{error}</div>}
    <div className="grid-2" style={{marginTop:14}}>
      <section className="card"><h2 style={{marginTop:0}}>เพิ่มนักเรียนทีละคน</h2><form className="stack" onSubmit={addStudent}>
        <div className="grid-2"><label>เลขที่<input name="number" type="number" min="1" required /></label><label>รหัสนักเรียน<input name="studentCode" required /></label></div>
        <div className="grid-3"><label>คำนำหน้า<input name="prefix" placeholder="เด็กชาย" /></label><label>ชื่อ<input name="firstName" required /></label><label>นามสกุล<input name="lastName" required /></label></div>
        <label>PIN อย่างน้อย 6 ตัว<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6,}" minLength={6} required /></label>
        <button className="btn btn-primary" disabled={loading || !selectedClassroom.is_active}>เพิ่มเข้าห้อง {selectedClassroom.name}</button>
      </form></section>
      <section className="card"><h2 style={{marginTop:0}}>นำเข้าจาก Excel / XLS / CSV</h2><form className="stack" onSubmit={importFile}><p className="muted">ไฟล์จะถูกนำเข้าทั้งหมดไปยัง <strong>{selectedClassroom.name}</strong> ระบบตรวจหัวคอลัมน์ เลขที่ รหัสนักเรียน PIN และห้องปลายทางก่อนสร้างบัญชี</p><input name="file" type="file" accept=".xlsx,.xls,.csv" required /><button className="btn btn-orange" disabled={loading || !selectedClassroom.is_active}>นำเข้าไปยัง {selectedClassroom.name}</button></form></section>
    </div>

    <section className="card" style={{marginTop:14}}><div className="row" style={{justifyContent:'space-between'}}><h2 style={{margin:0}}>รายชื่อนักเรียน</h2><span className="badge badge-gray">{students.length} คน</span></div>
      {loading ? <div className="loading">กำลังโหลด…</div> : <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>เลขที่</th><th>รหัสนักเรียน</th><th>ชื่อ–นามสกุล</th><th>สถานะ</th><th>NFC Tag</th><th>จัดการ</th></tr></thead><tbody>{students.map((s) => <tr key={s.id}><td>{s.number}</td><td>{s.student_code}</td><td>{s.prefix}{s.first_name} {s.last_name}</td><td><span className={`badge ${s.active?'badge-green':'badge-red'}`}>{s.active?'ใช้งาน':'ถูกระงับ'}</span></td><td><span className={`badge ${s.nfc_status==='active'?'badge-green':s.nfc_status==='revoked'?'badge-red':'badge-gray'}`}>{s.nfc_status==='active'?'ใช้งาน':s.nfc_status==='revoked'?'ถูกยกเลิก':'ยังไม่มีแท็ก'}</span></td><td><div className="row"><button className="btn btn-secondary btn-sm" onClick={() => setEditStudent(s)}>แก้ไข/ย้าย</button><button className="btn btn-primary btn-sm" onClick={() => issue(s)} disabled={!s.active}>สร้างลิงก์</button>{s.nfc_status==='active' && <button className="btn btn-danger btn-sm" onClick={() => revoke(s)}>ยกเลิกแท็ก</button>}<button className="btn btn-ghost btn-sm" onClick={() => toggleStudent(s)}>{s.active?'ระงับ':'เปิดใช้งาน'}</button></div></td></tr>)}</tbody></table></div>}
    </section>

    {nfcUrl && <div className="modal-backdrop" role="dialog"><div className="modal stack"><h2 style={{margin:0}}>ลิงก์ NFC สร้างสำเร็จ</h2><div className="message message-success">ระบบเก็บเฉพาะ SHA-256 hash ลิงก์จริงแสดงครั้งนี้เพื่อให้ครูนำไปเขียนลง NFC Tag</div><div className="code-box">{nfcUrl}</div><div className="row" style={{justifyContent:'flex-end'}}><button className="btn btn-primary" onClick={async () => { await navigator.clipboard.writeText(nfcUrl); alert('คัดลอกแล้ว') }}>คัดลอก URL</button><button className="btn btn-secondary" onClick={() => setNfcUrl('')}>ปิด</button></div></div></div>}
    {editStudent && <EditStudentModal student={editStudent} classrooms={classrooms} onClose={() => setEditStudent(null)} onSaved={async () => { setEditStudent(null); await load(); await reloadClassrooms() }} />}
  </>
}

function EditStudentModal({student, classrooms, onClose, onSaved}:{student:Student; classrooms:ReturnType<typeof useClassroom>['classrooms']; onClose:()=>void; onSaved:()=>Promise<void>}) {
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError('');const f=new FormData(e.currentTarget);try{await apiFetch(`/api/teacher/students/${student.id}`,{method:'PATCH',body:JSON.stringify({number:f.get('number'),prefix:f.get('prefix'),firstName:f.get('firstName'),lastName:f.get('lastName'),pin:f.get('pin'),classroomId:f.get('classroomId')})});await onSaved()}catch(e){setError(e instanceof Error?e.message:'แก้ไขไม่สำเร็จ')}finally{setLoading(false)}}
  return <div className="modal-backdrop"><div className="modal stack"><h2 style={{margin:0}}>แก้ไขนักเรียน</h2><div className="message message-error">หากนักเรียนมีประวัติเช็กชื่อแล้ว ระบบจะไม่อนุญาตให้ย้ายห้อง เพื่อรักษาประวัติห้องเดิมไม่ให้สูญหายหรือเปลี่ยนย้อนหลัง</div><form className="stack" onSubmit={submit}><div className="grid-2"><label>เลขที่<input name="number" type="number" min="1" defaultValue={student.number} required /></label><label>รหัสนักเรียน<input value={student.student_code} readOnly /></label></div><div className="grid-3"><label>คำนำหน้า<input name="prefix" defaultValue={student.prefix}/></label><label>ชื่อ<input name="firstName" defaultValue={student.first_name} required/></label><label>นามสกุล<input name="lastName" defaultValue={student.last_name} required/></label></div><label>ห้องเรียน<select name="classroomId" defaultValue={student.classroom_id}>{classrooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>PIN ใหม่ (เว้นว่าง = ไม่เปลี่ยน)<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6,}" /></label>{error&&<div className="message message-error">{error}</div>}<div className="row" style={{justifyContent:'flex-end'}}><button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" disabled={loading}>{loading?'กำลังบันทึก…':'บันทึก'}</button></div></form></div></div>
}
