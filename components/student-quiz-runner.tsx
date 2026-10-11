'use client'

import { useEffect, useRef, useState } from 'react'

type Question = {
  id: string
  position: number
  question_text: string
  points: number
  choices: { value: 'A' | 'B' | 'C' | 'D'; label: string }[]
}

type StartPayload = {
  serverNow: string
  deadline: string
  quiz: { id: string; title: string; description: string; show_score_after_submit: boolean }
  attempt: { id: string; started_at: string; attempt_no: number }
  questions: Question[]
}

type SubmitResult = {
  ok: boolean
  answeredCount: number
  questionCount: number
  score: number | null
  maxScore: number | null
  showScore: boolean
}

function timeText(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StudentQuizRunner({ quizId }: { quizId: string }) {
  const [data, setData] = useState<StartPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const serverOffset = useRef(0)
  const submitStarted = useRef(false)

  useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch(`/api/student/quizzes/${quizId}/start`, { method: 'POST', cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'เริ่มแบบทดสอบไม่สำเร็จ')
        serverOffset.current = new Date(payload.serverNow).getTime() - Date.now()
        setData(payload)
        const storageKey = `quiz-attempt-${payload.attempt.id}`
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try { setAnswers(JSON.parse(saved)) } catch { /* ignore damaged local cache */ }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เริ่มแบบทดสอบไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    })()
  }, [quizId])

  useEffect(() => {
    if (!data || result) return
    const tick = () => {
      const serverNow = Date.now() + serverOffset.current
      const seconds = Math.max(0, Math.ceil((new Date(data.deadline).getTime() - serverNow) / 1000))
      setRemaining(seconds)
      if (seconds <= 0 && !submitStarted.current) void submit(true)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [data, result])

  function choose(questionId: string, value: string) {
    if (!data || submitting || result) return
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    localStorage.setItem(`quiz-attempt-${data.attempt.id}`, JSON.stringify(next))
  }

  async function submit(auto = false) {
    if (!data || submitStarted.current) return
    if (!auto && Object.keys(answers).length < data.questions.length) {
      const ok = window.confirm(`ตอบแล้ว ${Object.keys(answers).length}/${data.questions.length} ข้อ ต้องการส่งเลยหรือไม่?`)
      if (!ok) return
    }

    submitStarted.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/student/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ attemptId: data.attempt.id, answers }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'ส่งแบบทดสอบไม่สำเร็จ')
      localStorage.removeItem(`quiz-attempt-${data.attempt.id}`)
      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งแบบทดสอบไม่สำเร็จ')
      submitStarted.current = false
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">กำลังเตรียมแบบทดสอบ…</div>
  if (error && !data) return <div className="message message-error">{error}</div>
  if (!data) return null

  if (result) {
    return <section className="card stack" style={{ textAlign: 'center' }}>
      <div className="brand-mark" style={{ margin: '0 auto', background: 'var(--green)' }}>✓</div>
      <h1 className="page-title">ส่งแบบทดสอบเรียบร้อย</h1>
      <p>ตอบ {result.answeredCount}/{result.questionCount} ข้อ</p>
      {result.showScore && result.score != null && <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--green)' }}>{result.score}/{result.maxScore}</div>}
      {!result.showScore && <p className="muted">ครูตั้งค่าไม่ให้แสดงคะแนนทันที</p>}
      <a className="btn btn-primary" href="/student/quizzes">กลับรายการแบบทดสอบ</a>
    </section>
  }

  return <div className="stack">
    <section className="card stack">
      <div className="header-row">
        <div>
          <span className="badge badge-orange">แบบทดสอบ 10 ข้อ</span>
          <h1 className="page-title">{data.quiz.title}</h1>
          {data.quiz.description && <p className="muted">{data.quiz.description}</p>}
        </div>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div className="muted">เวลาคงเหลือ</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: remaining <= 60 ? 'var(--red)' : 'var(--green)' }}>{timeText(remaining)}</div>
        </div>
      </div>
      <div className="message">ระบบจะส่งอัตโนมัติเมื่อหมดเวลา กรุณาอย่าปิดหน้าจอระหว่างส่งคำตอบ</div>
      {error && <div className="message message-error">{error}</div>}
    </section>

    {data.questions.map((q, index) => <section className="card stack" key={q.id}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>ข้อ {index + 1}</strong>
        <span className="badge badge-gray">{q.points} คะแนน</span>
      </div>
      <h2 style={{ margin: 0, lineHeight: 1.5 }}>{q.question_text}</h2>
      <div className="stack">
        {q.choices.map((choice) => <label key={choice.value} style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          padding: 12,
          border: answers[q.id] === choice.value ? '2px solid var(--green)' : '1px solid var(--gray-200)',
          borderRadius: 12,
          background: answers[q.id] === choice.value ? 'var(--green-soft)' : 'white',
          cursor: 'pointer',
        }}>
          <input
            type="radio"
            name={q.id}
            value={choice.value}
            checked={answers[q.id] === choice.value}
            onChange={() => choose(q.id, choice.value)}
            style={{ width: 20, marginTop: 2 }}
          />
          <span><strong>{choice.value}.</strong> {choice.label}</span>
        </label>)}
      </div>
    </section>)}

    <section className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>ตอบแล้ว {Object.keys(answers).length}/{data.questions.length} ข้อ</strong>
        <span className="muted">เหลือ {timeText(remaining)}</span>
      </div>
      <button className="btn btn-primary" type="button" disabled={submitting} onClick={() => void submit(false)}>
        {submitting ? 'กำลังส่งคำตอบ…' : 'ส่งแบบทดสอบ'}
      </button>
    </section>
  </div>
}
