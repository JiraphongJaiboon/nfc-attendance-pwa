'use client'

import { useEffect, useState } from 'react'

type Quiz = {
  id: string
  title: string
  description: string
  opens_at: string
  closes_at: string
  duration_minutes: number | null
  max_attempts: number
  attempts_used: number
  latest_attempt: null | {
    status: 'in_progress' | 'submitted' | 'expired'
    score: number
    max_score: number
    submitted_at: string | null
  }
}

function formatBangkok(iso: string) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function StudentQuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [serverNow, setServerNow] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/student/quizzes', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'โหลดแบบทดสอบไม่สำเร็จ')
      setQuizzes(data.quizzes ?? [])
      setServerNow(data.serverNow)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดแบบทดสอบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) return <div className="loading">กำลังโหลดแบบทดสอบ…</div>
  if (error) return <div className="message message-error">{error}</div>

  const now = serverNow ? new Date(serverNow).getTime() : Date.now()

  return <div className="stack">
    <div>
      <h1 className="page-title">แบบทดสอบ</h1>
      <p className="page-subtitle">ทำแบบทดสอบตามช่วงเวลาที่ครูกำหนด ระบบจับเวลาจากเซิร์ฟเวอร์</p>
    </div>

    {!quizzes.length ? <div className="card empty">ยังไม่มีแบบทดสอบที่ครูเผยแพร่</div> : quizzes.map((q) => {
      const latest = q.latest_attempt
      const open = now >= new Date(q.opens_at).getTime() && now < new Date(q.closes_at).getTime()
      const upcoming = now < new Date(q.opens_at).getTime()
      const submitted = latest?.status === 'submitted'
      const canStart = open && !submitted && (latest?.status === 'in_progress' || q.attempts_used < q.max_attempts)

      return <article className="card stack" key={q.id}>
        <div className="header-row">
          <div>
            <div className="row">
              {submitted ? <span className="badge badge-green">ส่งแล้ว</span> :
                upcoming ? <span className="badge badge-orange">ยังไม่เปิด</span> :
                  open ? <span className="badge badge-green">เปิดให้ทำ</span> :
                    <span className="badge badge-gray">ปิดแล้ว</span>}
              <span className="badge badge-gray">10 ข้อ</span>
            </div>
            <h2 style={{ marginBottom: 4 }}>{q.title}</h2>
            {q.description && <p className="muted" style={{ margin: 0 }}>{q.description}</p>}
          </div>
        </div>
        <div className="grid-2">
          <div><strong>เปิด:</strong> {formatBangkok(q.opens_at)}</div>
          <div><strong>ปิด:</strong> {formatBangkok(q.closes_at)}</div>
          <div><strong>เวลาทำ:</strong> {q.duration_minutes ? `${q.duration_minutes} นาที` : 'จนถึงเวลาปิด'}</div>
          <div><strong>สิทธิ์:</strong> {q.attempts_used}/{q.max_attempts} ครั้ง</div>
        </div>

        {submitted && <div className="message message-success">
          ส่งแบบทดสอบแล้ว{Number.isFinite(latest.score) ? ` · คะแนน ${latest.score}/${latest.max_score}` : ''}
        </div>}
        {canStart && <a className="btn btn-primary" href={`/student/quizzes/${q.id}`}>{latest?.status === 'in_progress' ? 'ทำต่อ' : 'เริ่มทำแบบทดสอบ'}</a>}
        {!canStart && !submitted && upcoming && <div className="message">รอถึงเวลาเปิดแบบทดสอบ</div>}
        {!canStart && !submitted && !upcoming && !open && <div className="message">แบบทดสอบปิดรับคำตอบแล้ว</div>}
      </article>
    })}
  </div>
}
