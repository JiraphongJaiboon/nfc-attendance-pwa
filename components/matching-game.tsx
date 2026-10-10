'use client'

import { useEffect, useState } from 'react'

type MatchCard = {
  key: string
  pair: number
  kind: 'term' | 'meaning'
  text: string
}

const PAIRS = [
  ['ภาพด้านหน้า (Front View)', 'มุมมองที่มองตรงจากด้านหน้าของชิ้นงาน'],
  ['ภาพด้านบน (Top View)', 'มุมมองที่มองลงมาจากด้านบนของชิ้นงาน'],
  ['ภาพด้านขวา (Right View)', 'มุมมองที่มองชิ้นงานจากด้านขวา'],
  ['Orthographic Projection', 'การถ่ายทอดวัตถุ 3 มิติเป็นภาพ 2 มิติหลายด้าน'],
  ['First-angle Projection', 'วัตถุอยู่ระหว่างผู้มองกับระนาบฉาย'],
  ['Third-angle Projection', 'ระนาบฉายอยู่ระหว่างผู้มองกับวัตถุ'],
] as const

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function makeCards(): MatchCard[] {
  return shuffle(PAIRS.flatMap((pair, index) => [
    { key: `${index}-term`, pair: index, kind: 'term' as const, text: pair[0] },
    { key: `${index}-meaning`, pair: index, kind: 'meaning' as const, text: pair[1] },
  ]))
}

export function MatchingGame() {
  const [cards, setCards] = useState<MatchCard[]>(() => makeCards())
  const [first, setFirst] = useState<number | null>(null)
  const [second, setSecond] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [wrong, setWrong] = useState(0)
  const [best, setBest] = useState(0)

  const finished = matched.length === PAIRS.length
  const score = Math.max(10, 100 - wrong * 5)

  useEffect(() => {
    const saved = Number(localStorage.getItem('projection-matching-best') ?? 0)
    setBest(Number.isFinite(saved) ? saved : 0)
  }, [])

  useEffect(() => {
    if (!finished) return
    if (score > best) {
      localStorage.setItem('projection-matching-best', String(score))
      setBest(score)
    }
  }, [finished, score, best])

  function choose(index: number) {
    if (second !== null || matched.includes(cards[index].pair)) return
    if (first === index) return

    if (first === null) {
      setFirst(index)
      return
    }

    setSecond(index)
    const a = cards[first]
    const b = cards[index]
    const isMatch = a.pair === b.pair && a.kind !== b.kind

    window.setTimeout(() => {
      if (isMatch) setMatched((old) => [...old, a.pair])
      else setWrong((old) => old + 1)
      setFirst(null)
      setSecond(null)
    }, 600)
  }

  function restart() {
    setCards(makeCards())
    setFirst(null)
    setSecond(null)
    setMatched([])
    setWrong(0)
  }

  return <section className="card stack">
    <div className="header-row">
      <div>
        <span className="badge badge-orange">🧩 เกมที่ 1</span>
        <h1 className="page-title">จับคู่ภาพฉาย</h1>
        <p className="muted">แตะคำศัพท์ 1 ใบ แล้วแตะความหมายที่ตรงกันให้ครบทั้ง 6 คู่</p>
      </div>
      <div className="row">
        <span className="badge badge-green">จับคู่แล้ว {matched.length}/{PAIRS.length}</span>
        <span className="badge badge-gray">Best {best}</span>
      </div>
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
      gap: 10,
    }}>
      {cards.map((card, index) => {
        const done = matched.includes(card.pair)
        const selected = first === index || second === index
        return <button
          key={card.key}
          type="button"
          onClick={() => choose(index)}
          disabled={done}
          style={{
            minHeight: 112,
            padding: 12,
            borderRadius: 14,
            border: selected ? '3px solid var(--orange)' : '1px solid #d9dde3',
            background: done ? '#dcfce7' : selected ? '#fff7ed' : '#fff',
            cursor: done ? 'default' : 'pointer',
            fontWeight: card.kind === 'term' ? 700 : 500,
            lineHeight: 1.45,
          }}
        >
          {done ? '✓ ' : ''}{card.text}
        </button>
      })}
    </div>

    {finished && <div className="message message-success">
      🎉 สำเร็จ! คะแนน {score}/100 {score >= best ? '· ทำสถิติสูงสุดแล้ว' : ''}
    </div>}

    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="muted">จับผิด {wrong} ครั้ง · ผิด 1 ครั้งหัก 5 คะแนน</span>
      <button className="btn btn-secondary" type="button" onClick={restart}>เล่นใหม่</button>
    </div>
  </section>
}
