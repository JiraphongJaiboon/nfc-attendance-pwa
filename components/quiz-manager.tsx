'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useClassroom } from '@/components/teacher-shell'

type Quiz = {
  id: string
  classroom_id: string
  title: string
  description: string
  opens_at: string
  closes_at: string
  duration_minutes: number | null
  max_attempts: number
  shuffle_questions: boolean
  show_score_after_submit: boolean
  is_published: boolean
  question_count: number
  submitted_count: number
}

type ResultRow = {
  student_id: string
  number: number
  student_code: string
  name: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'expired'
  score: number | null
  max_score: number | null
  submitted_at: string | null
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatBangkok(iso: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function isoFromLocal(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function QuizManager() {
  const { selectedId, selectedClassroom } = useClassroom()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [serverNow, setServerNow] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editId, setEditId] = useState('')
  const [resultsQuizId, setResultsQuizId] = useState('')
  const [results, setResults] = useState<ResultRow[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)

  const defaults = useMemo(() => {
    const open = new Date(Date.now() + 10 * 60 * 1000)
    const close = new Date(open.getTime() + 60 * 60 * 1000)
    return { open: toLocalInput(open), close: toLocalInput(close) }
  }, [])

  const [title, setTitle] = useState('แบบทดสอบการเขียนภาพฉาย 10 ข้อ')
  const [description, setDescription] = useState('แบบทดสอบปรนัย 4 ตัวเลือก จำนวน 10 ข้อ ข้อละ 1 คะแนน')
  const [opensAt, setOpensAt] = useState(defaults.open)
  const [closesAt, setClosesAt] = useState(defaults.close)
  const [duration, setDuration] = useState('30')
  const [published, setPublished] = useState(true)

  async function load() {
    if (!selectedId) {
      setQuizzes([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ quizzes: Quiz[]; serverNow: string }>(`/api/teacher/quizzes?classroomId=${encodeURIComponent(selectedId)}`)
      setQuizzes(data.quizzes)
      setServerNow(data.serverNow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดแบบทดสอบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [selectedId])

  async function createQuiz(e: FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiFetch('/api/teacher/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          classroomId: selectedId,
          title,
          description,
          opensAt: isoFromLocal(opensAt),
          closesAt: isoFromLocal(closesAt),
          durationMinutes: Number(duration),
          maxAttempts: 1,
          isPublished: published,
        }),
      })
      setNotice('สร้างแบบทดสอบ 10 ข้อเรียบร้อย')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างแบบทดสอบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  function statusOf(q: Quiz) {
    if (!q.is_published) return { label: 'ฉบับร่าง', cls: 'badge-gray' }
    const now = serverNow ? new Date(serverNow).getTime() : Date.now()
    if (now < new Date(q.opens_at).getTime()) return { label: 'ยังไม่เปิด', cls: 'badge-orange' }
    if (now >= new Date(q.closes_at).getTime()) return { label: 'ปิดแล้ว', cls: 'badge-gray' }
    return { label: 'กำลังเปิด', cls: 'badge-green' }
  }

  async function patchQuiz(id: string, patch: Record<string, unknown>) {
    setError('')
    setNotice('')
    try {
      await apiFetch(`/api/teacher/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setNotice('บันทึกการตั้งค่าแบบทดสอบแล้ว')
      setEditId('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function loadResults(id: string) {
    setResultsQuizId(id)
    setResultsLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ results: ResultRow[] }>(`/api/teacher/quizzes/${id}/results`)
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดคะแนนไม่สำเร็จ')
    } finally {
      setResultsLoading(false)
    }
  }

  return <div className="stack">
    <div>
      <h1 className="page-title">แบบทดสอบ</h1>
      <p className="page-subtitle">สร้างแบบทดสอบ 10 ข้อ กำหนดเวลาเปิด–ปิด และดูคะแนนรายคน — {selectedClassroom?.name || 'กรุณาเลือกห้อง'}</p>
    </div>

    {error && <div className="message message-error">{error}</div>}
    {notice && <div className="message message-success">{notice}</div>}

    <form className="card stack" onSubmit={createQuiz}>
      <div>
        <h2 style={{ margin: 0 }}>สร้างแบบทดสอบการเขียนภาพฉาย</h2>
        <p className="muted">ระบบจะใส่คำถามตัวอย่าง 10 ข้อให้อัตโนมัติ ข้อละ 1 คะแนน</p>
      </div>
      <label>ชื่อแบบทดสอบ<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} /></label>
      <label>คำอธิบาย<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></label>
      <div className="grid-2">
        <label>เปิดให้ทำ<input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} required /></label>
        <label>ปิดรับคำตอบ<input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required /></label>
      </div>
      <div className="grid-2">
        <label>เวลาทำต่อคน (นาที)<input type="number" min={1} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} required /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} style={{ width: 20 }} />
          เผยแพร่ให้นักเรียนเห็น
        </label>
      </div>
      <button className="btn btn-primary" type="submit" disabled={!selectedId || saving}>{saving ? 'กำลังสร้าง…' : 'สร้างแบบทดสอบ 10 ข้อ'}</button>
    </form>

    <div className="stack">
      <div className="header-row">
        <h2 style={{ margin: 0 }}>แบบทดสอบของห้องนี้</h2>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => void load()} disabled={loading}>รีเฟรช</button>
      </div>

      {loading ? <div className="loading">กำลังโหลด…</div> : !quizzes.length ? <div className="card empty">ยังไม่มีแบบทดสอบ</div> : quizzes.map((q) => {
        const status = statusOf(q)
        return <section className="card stack" key={q.id}>
          <div className="header-row">
            <div>
              <div className="row">
                <span className={`badge ${status.cls}`}>{status.label}</span>
                <span className="badge badge-gray">{q.question_count} ข้อ</span>
                <span className="badge badge-gray">ส่งแล้ว {q.submitted_count} คน</span>
              </div>
              <h2 style={{ marginBottom: 4 }}>{q.title}</h2>
              {q.description && <p className="muted" style={{ margin: 0 }}>{q.description}</p>}
            </div>
          </div>
          <div className="grid-2">
            <div><strong>เปิด:</strong> {formatBangkok(q.opens_at)}</div>
            <div><strong>ปิด:</strong> {formatBangkok(q.closes_at)}</div>
            <div><strong>เวลาทำ:</strong> {q.duration_minutes ? `${q.duration_minutes} นาที` : 'จนถึงเวลาปิด'}</div>
            <div><strong>จำนวนครั้ง:</strong> {q.max_attempts} ครั้ง</div>
          </div>

          {editId === q.id ? <QuizScheduleEditor quiz={q} onCancel={() => setEditId('')} onSave={(patch) => void patchQuiz(q.id, patch)} /> : <div className="row">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditId(q.id)}>แก้ไขเวลา</button>
            <button className="btn btn-orange btn-sm" type="button" onClick={() => void patchQuiz(q.id, { isPublished: !q.is_published })}>{q.is_published ? 'ซ่อนจากนักเรียน' : 'เผยแพร่'}</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void loadResults(q.id)}>ดูคะแนน</button>
          </div>}

          {resultsQuizId === q.id && <div className="stack" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
            <h3 style={{ margin: 0 }}>ผลคะแนนนักเรียน</h3>
            {resultsLoading ? <div className="loading">กำลังโหลดคะแนน…</div> : <QuizResultsTable rows={results} />}
          </div>}
        </section>
      })}
    </div>
  </div>
}

function QuizScheduleEditor({ quiz, onCancel, onSave }: { quiz: Quiz; onCancel: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(toLocalInput(new Date(quiz.opens_at)))
  const [close, setClose] = useState(toLocalInput(new Date(quiz.closes_at)))
  const [duration, setDuration] = useState(String(quiz.duration_minutes ?? 30))

  return <div className="card stack" style={{ background: 'var(--gray-50)' }}>
    <div className="grid-2">
      <label>เปิดให้ทำ<input type="datetime-local" value={open} onChange={(e) => setOpen(e.target.value)} /></label>
      <label>ปิดรับคำตอบ<input type="datetime-local" value={close} onChange={(e) => setClose(e.target.value)} /></label>
    </div>
    <label>เวลาทำต่อคน (นาที)<input type="number" min={1} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
    <div className="row">
      <button className="btn btn-primary btn-sm" type="button" onClick={() => onSave({ opensAt: isoFromLocal(open), closesAt: isoFromLocal(close), durationMinutes: Number(duration) })}>บันทึกเวลา</button>
      <button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>ยกเลิก</button>
    </div>
  </div>
}

function QuizResultsTable({ rows }: { rows: ResultRow[] }) {
  if (!rows.length) return <div className="empty">ยังไม่มีรายชื่อนักเรียน</div>
  const labels: Record<ResultRow['status'], string> = {
    not_started: 'ยังไม่เริ่ม',
    in_progress: 'กำลังทำ',
    submitted: 'ส่งแล้ว',
    expired: 'หมดเวลา',
  }
  return <div style={{ overflowX: 'auto' }}>
    <table>
      <thead><tr><th>เลขที่</th><th>รหัส</th><th>ชื่อ–นามสกุล</th><th>สถานะ</th><th>คะแนน</th><th>เวลาส่ง</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.student_id}>
        <td>{row.number}</td>
        <td>{row.student_code}</td>
        <td>{row.name}</td>
        <td>{labels[row.status]}</td>
        <td>{row.score == null ? '-' : `${row.score}/${row.max_score ?? 0}`}</td>
        <td>{row.submitted_at ? formatBangkok(row.submitted_at) : '-'}</td>
      </tr>)}</tbody>
    </table>
  </div>
}
