'use client'

import { useEffect, useState } from 'react'

const QUESTIONS = [
  {
    q: 'ภาพที่มองตรงจากด้านหน้าของชิ้นงานเรียกว่าอะไร?',
    choices: ['Top View', 'Front View', 'Right View', 'Isometric View'],
    answer: 1,
    explain: 'Front View คือภาพฉายที่มองจากด้านหน้าของชิ้นงาน',
  },
  {
    q: 'ภาพที่มองจากด้านบนลงมาเรียกว่าอะไร?',
    choices: ['Front View', 'Bottom View', 'Top View', 'Left View'],
    answer: 2,
    explain: 'Top View แสดงรูปร่างของชิ้นงานเมื่อมองจากด้านบน',
  },
  {
    q: 'Right View คือการมองชิ้นงานจากด้านใด?',
    choices: ['ด้านบน', 'ด้านหน้า', 'ด้านซ้าย', 'ด้านขวา'],
    answer: 3,
    explain: 'Right View คือภาพฉายเมื่อมองจากด้านขวาของชิ้นงาน',
  },
  {
    q: 'จุดประสงค์หลักของ Orthographic Projection คือข้อใด?',
    choices: ['ทำภาพให้มีสีสวย', 'แสดงวัตถุ 3 มิติเป็นภาพ 2 มิติหลายด้าน', 'สร้างภาพเคลื่อนไหว', 'คำนวณน้ำหนัก'],
    answer: 1,
    explain: 'ภาพฉาย Orthographic ใช้หลายมุมมองเพื่อบอกรูปร่างและขนาดของวัตถุอย่างชัดเจน',
  },
  {
    q: 'ในการฉายภาพแบบ First-angle ตำแหน่งใดอยู่ระหว่างผู้มองกับระนาบฉาย?',
    choices: ['วัตถุ', 'เส้นบอกขนาด', 'กระดาษ', 'จุดศูนย์กลาง'],
    answer: 0,
    explain: 'First-angle: วัตถุอยู่ระหว่างผู้มองกับระนาบฉาย',
  },
  {
    q: 'ในการฉายภาพแบบ Third-angle อะไรอยู่ระหว่างผู้มองกับวัตถุ?',
    choices: ['ระนาบฉาย', 'ไม้บรรทัด', 'เส้นแกน', 'ไม่มีสิ่งใด'],
    answer: 0,
    explain: 'Third-angle: ระนาบฉายอยู่ระหว่างผู้มองกับวัตถุ',
  },
  {
    q: 'ถ้าต้องการดู “ความกว้างและความลึก” ของชิ้นงาน ควรพิจารณาภาพใดมากที่สุด?',
    choices: ['Top View', 'Front View', 'Right View', 'ภาพตัด'],
    answer: 0,
    explain: 'Top View มักแสดงมิติกว้างและลึกได้ชัดเจน',
  },
  {
    q: 'ถ้าต้องการดู “ความสูงและความลึก” ของชิ้นงาน ควรพิจารณาภาพใด?',
    choices: ['Top View', 'Right View', 'แปลน', 'ภาพเปอร์สเปกทีฟเท่านั้น'],
    answer: 1,
    explain: 'Side/Right View ช่วยแสดงความสูงและความลึกของชิ้นงาน',
  },
  {
    q: 'ข้อใดเป็นชุดภาพฉายพื้นฐานที่ใช้บ่อย?',
    choices: ['หน้า–บน–ขวา', 'หน้า–หลัง–ล่างเท่านั้น', 'บน–ล่างเท่านั้น', 'ซ้าย–ขวาเท่านั้น'],
    answer: 0,
    explain: 'Front, Top และ Right View เป็นชุดมุมมองพื้นฐานที่ใช้บ่อยในการเขียนภาพฉาย',
  },
  {
    q: 'ก่อนเขียนภาพฉาย ควรทำสิ่งใดก่อน?',
    choices: ['เลือกด้านหน้าที่สื่อรูปร่างชิ้นงานได้ชัด', 'ลงสีชิ้นงานก่อน', 'เขียนชื่ออย่างเดียว', 'วาดแบบอิสระโดยไม่กำหนดมุม'],
    answer: 0,
    explain: 'ควรเลือก Front View ที่แสดงลักษณะสำคัญของชิ้นงานได้ชัดเจนก่อน',
  },
] as const

export function ProjectionQuizGame() {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const saved = Number(localStorage.getItem('projection-quiz-best') ?? 0)
    setBest(Number.isFinite(saved) ? saved : 0)
  }, [])

  const current = QUESTIONS[index]
  const correct = selected === current.answer

  function choose(choice: number) {
    if (selected !== null) return
    setSelected(choice)
    if (choice === current.answer) setScore((old) => old + 10)
  }

  function next() {
    if (index === QUESTIONS.length - 1) {
      const finalScore = score
      if (finalScore > best) {
        localStorage.setItem('projection-quiz-best', String(finalScore))
        setBest(finalScore)
      }
      setFinished(true)
      return
    }
    setIndex((old) => old + 1)
    setSelected(null)
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return <section className="card stack" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>{score >= 80 ? '🏆' : score >= 60 ? '⭐' : '💪'}</div>
      <h1 className="page-title">จบเกมแล้ว!</h1>
      <div style={{ fontSize: 42, fontWeight: 800 }}>{score}/100</div>
      <p className="muted">คะแนนสูงสุดในเครื่องนี้: {Math.max(best, score)}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" type="button" onClick={restart}>เล่นอีกครั้ง</button>
        <a className="btn btn-secondary" href="/student/games">เลือกเกมอื่น</a>
      </div>
    </section>
  }

  return <section className="card stack">
    <div className="header-row">
      <div>
        <span className="badge badge-green">⚡ เกมที่ 2</span>
        <h1 className="page-title">ตอบเร็วภาพฉาย</h1>
      </div>
      <div className="row">
        <span className="badge badge-gray">ข้อ {index + 1}/{QUESTIONS.length}</span>
        <span className="badge badge-orange">คะแนน {score}</span>
      </div>
    </div>

    <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
      <div style={{
        width: `${((index + 1) / QUESTIONS.length) * 100}%`,
        height: '100%',
        background: 'var(--green)',
      }} />
    </div>

    <h2 style={{ lineHeight: 1.5 }}>{current.q}</h2>

    <div className="grid-2">
      {current.choices.map((choice, choiceIndex) => {
        const isAnswer = choiceIndex === current.answer
        const isSelected = choiceIndex === selected
        let background = '#fff'
        let border = '1px solid #d9dde3'
        if (selected !== null && isAnswer) {
          background = '#dcfce7'
          border = '2px solid #16a34a'
        } else if (isSelected) {
          background = '#fee2e2'
          border = '2px solid #dc2626'
        }
        return <button
          type="button"
          key={choice}
          onClick={() => choose(choiceIndex)}
          disabled={selected !== null}
          style={{
            minHeight: 72,
            padding: 12,
            borderRadius: 14,
            border,
            background,
            cursor: selected === null ? 'pointer' : 'default',
            fontSize: 16,
            fontWeight: 650,
          }}
        >
          {String.fromCharCode(65 + choiceIndex)}. {choice}
        </button>
      })}
    </div>

    {selected !== null && <div className={`message ${correct ? 'message-success' : 'message-error'}`}>
      <strong>{correct ? '✓ ถูกต้อง' : '✕ ยังไม่ถูก'}</strong><br />{current.explain}
    </div>}

    {selected !== null && <div className="row" style={{ justifyContent: 'flex-end' }}>
      <button className="btn btn-primary" type="button" onClick={next}>
        {index === QUESTIONS.length - 1 ? 'ดูคะแนนรวม' : 'ข้อต่อไป →'}
      </button>
    </div>}
  </section>
}
