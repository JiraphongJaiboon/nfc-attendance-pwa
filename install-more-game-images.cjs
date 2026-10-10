const fs = require('fs')
const path = require('path')

const files = {
  'components/matching-game.tsx': String.raw`'use client'

import { useEffect, useState } from 'react'

type FigureKind = 'front' | 'top' | 'right' | 'first' | 'third' | 'iso'
type MatchCard = {
  key: string
  pair: number
  kind: 'image' | 'label'
  text: string
  figure?: FigureKind
}

const PAIRS: Array<{ label: string; figure: FigureKind; hint: string }> = [
  { label: 'ภาพด้านหน้า (Front View)', figure: 'front', hint: 'มองตรงจากด้านหน้า' },
  { label: 'ภาพด้านบน (Top View)', figure: 'top', hint: 'มองจากด้านบนลงมา' },
  { label: 'ภาพด้านขวา (Right View)', figure: 'right', hint: 'มองจากด้านขวา' },
  { label: 'First-angle Projection', figure: 'first', hint: 'วัตถุอยู่ระหว่างผู้มองกับระนาบฉาย' },
  { label: 'Third-angle Projection', figure: 'third', hint: 'ระนาบฉายอยู่ระหว่างผู้มองกับวัตถุ' },
  { label: 'ภาพไอโซเมตริก (Isometric)', figure: 'iso', hint: 'ภาพ 3 มิติที่เห็นสามด้าน' },
]

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
    { key: `${index}-image`, pair: index, kind: 'image' as const, text: pair.hint, figure: pair.figure },
    { key: `${index}-label`, pair: index, kind: 'label' as const, text: pair.label },
  ]))
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef7d00" strokeWidth="4" strokeLinecap="round" />
    <circle cx={x2} cy={y2} r="5" fill="#ef7d00" />
  </>
}

function Figure({ kind }: { kind: FigureKind }) {
  if (kind === 'front') return <svg viewBox="0 0 180 120" role="img" aria-label="ภาพด้านหน้า" style={{ width: '100%', maxHeight: 110 }}>
    <rect x="34" y="62" width="112" height="34" rx="3" fill="#d1fae5" stroke="#166534" strokeWidth="3" />
    <rect x="62" y="30" width="56" height="32" rx="3" fill="#fed7aa" stroke="#166534" strokeWidth="3" />
    <line x1="90" y1="16" x2="90" y2="27" stroke="#ef7d00" strokeWidth="4" />
    <polygon points="84,23 96,23 90,31" fill="#ef7d00" />
    <text x="90" y="112" textAnchor="middle" fontSize="12" fill="#374151">FRONT</text>
  </svg>

  if (kind === 'top') return <svg viewBox="0 0 180 120" role="img" aria-label="ภาพด้านบน" style={{ width: '100%', maxHeight: 110 }}>
    <rect x="38" y="28" width="104" height="66" rx="4" fill="#dbeafe" stroke="#166534" strokeWidth="3" />
    <rect x="66" y="46" width="48" height="30" rx="3" fill="#fed7aa" stroke="#166534" strokeWidth="3" />
    <line x1="90" y1="8" x2="90" y2="24" stroke="#ef7d00" strokeWidth="4" />
    <polygon points="84,20 96,20 90,28" fill="#ef7d00" />
    <text x="90" y="112" textAnchor="middle" fontSize="12" fill="#374151">TOP</text>
  </svg>

  if (kind === 'right') return <svg viewBox="0 0 180 120" role="img" aria-label="ภาพด้านขวา" style={{ width: '100%', maxHeight: 110 }}>
    <path d="M48 94V52H80V28H132V94Z" fill="#dcfce7" stroke="#166534" strokeWidth="3" />
    <line x1="160" y1="61" x2="138" y2="61" stroke="#ef7d00" strokeWidth="4" />
    <polygon points="144,55 144,67 135,61" fill="#ef7d00" />
    <text x="90" y="112" textAnchor="middle" fontSize="12" fill="#374151">RIGHT</text>
  </svg>

  if (kind === 'first') return <svg viewBox="0 0 180 120" role="img" aria-label="First angle projection" style={{ width: '100%', maxHeight: 110 }}>
    <circle cx="26" cy="57" r="13" fill="#fed7aa" stroke="#9a3412" strokeWidth="2" />
    <circle cx="26" cy="57" r="4" fill="#9a3412" />
    <rect x="74" y="35" width="36" height="44" rx="4" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
    <line x1="142" y1="22" x2="142" y2="93" stroke="#2563eb" strokeWidth="5" />
    <Arrow x1={45} y1={57} x2={68} y2={57} />
    <text x="92" y="108" textAnchor="middle" fontSize="11" fill="#374151">ผู้มอง → วัตถุ → ระนาบฉาย</text>
  </svg>

  if (kind === 'third') return <svg viewBox="0 0 180 120" role="img" aria-label="Third angle projection" style={{ width: '100%', maxHeight: 110 }}>
    <circle cx="26" cy="57" r="13" fill="#fed7aa" stroke="#9a3412" strokeWidth="2" />
    <circle cx="26" cy="57" r="4" fill="#9a3412" />
    <line x1="82" y1="22" x2="82" y2="93" stroke="#2563eb" strokeWidth="5" />
    <rect x="122" y="35" width="36" height="44" rx="4" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
    <Arrow x1={45} y1={57} x2={74} y2={57} />
    <text x="92" y="108" textAnchor="middle" fontSize="11" fill="#374151">ผู้มอง → ระนาบฉาย → วัตถุ</text>
  </svg>

  return <svg viewBox="0 0 180 120" role="img" aria-label="ภาพไอโซเมตริก" style={{ width: '100%', maxHeight: 110 }}>
    <polygon points="90,18 142,48 90,78 38,48" fill="#fed7aa" stroke="#166534" strokeWidth="3" />
    <polygon points="38,48 90,78 90,104 38,74" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
    <polygon points="142,48 90,78 90,104 142,74" fill="#bfdbfe" stroke="#166534" strokeWidth="3" />
    <rect x="72" y="37" width="36" height="28" fill="#fff7ed" stroke="#166534" strokeWidth="2" transform="skewY(0)" />
  </svg>
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
    }, 650)
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
        <h1 className="page-title">จับคู่ “ภาพ” กับ “ชื่อภาพฉาย”</h1>
        <p className="muted">เกมนี้มีภาพประกอบทุกคู่ แตะการ์ดภาพ 1 ใบ แล้วจับคู่กับชื่อที่ถูกต้อง</p>
      </div>
      <div className="row">
        <span className="badge badge-green">จับคู่แล้ว {matched.length}/{PAIRS.length}</span>
        <span className="badge badge-gray">Best {best}</span>
      </div>
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
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
            minHeight: 150,
            padding: 12,
            borderRadius: 16,
            border: selected ? '3px solid var(--orange)' : '1px solid #d9dde3',
            background: done ? '#dcfce7' : selected ? '#fff7ed' : '#fff',
            cursor: done ? 'default' : 'pointer',
            lineHeight: 1.45,
            boxShadow: selected ? '0 8px 24px rgba(0,0,0,.10)' : '0 3px 10px rgba(0,0,0,.05)',
          }}
        >
          {card.kind === 'image' && card.figure
            ? <><Figure kind={card.figure} /><div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{card.text}</div></>
            : <div style={{ fontWeight: 800, fontSize: 16 }}>{done ? '✓ ' : ''}{card.text}</div>}
        </button>
      })}
    </div>

    {finished && <div className="message message-success">
      🎉 สำเร็จ! คะแนน {score}/100 {score >= best ? '· ทำสถิติสูงสุดแล้ว' : ''}
    </div>}

    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="muted">จับผิด {wrong} ครั้ง · ผิด 1 ครั้งหัก 5 คะแนน</span>
      <button className="btn btn-secondary" type="button" onClick={restart}>สุ่มภาพแล้วเล่นใหม่</button>
    </div>
  </section>
}
`,
  'components/projection-quiz-game.tsx': String.raw`'use client'

import { useEffect, useState } from 'react'

type FigureKind = 'front' | 'top' | 'right' | 'multi' | 'first' | 'third' | 'widthDepth' | 'heightDepth' | 'threeViews' | 'chooseFront'

const QUESTIONS = [
  { figure: 'front', q: 'จากภาพลูกศรสีส้มกำลังมองชิ้นงานจากด้านใด?', choices: ['ด้านบน', 'ด้านหน้า', 'ด้านขวา', 'ด้านหลัง'], answer: 1, explain: 'ลูกศรชี้เข้าหาด้านหน้าของชิ้นงาน จึงเป็น Front View' },
  { figure: 'top', q: 'ภาพนี้กำลังแสดงการมองจากทิศทางใด?', choices: ['ด้านหน้า', 'ด้านล่าง', 'ด้านบน', 'ด้านซ้าย'], answer: 2, explain: 'ลูกศรชี้ลงจากด้านบน จึงเป็น Top View' },
  { figure: 'right', q: 'จากภาพ ลูกศรแสดงการมองชิ้นงานจากด้านใด?', choices: ['ด้านบน', 'ด้านหน้า', 'ด้านซ้าย', 'ด้านขวา'], answer: 3, explain: 'ลูกศรเข้าหาชิ้นงานจากด้านขวา จึงเป็น Right View' },
  { figure: 'multi', q: 'ภาพชุดนี้สื่อแนวคิดใดมากที่สุด?', choices: ['Perspective', 'Orthographic Projection', 'Animation', 'Freehand Sketch'], answer: 1, explain: 'Orthographic Projection ใช้ภาพ 2 มิติหลายด้านเพื่ออธิบายวัตถุ 3 มิติ' },
  { figure: 'first', q: 'จากแผนภาพนี้เป็นหลักการฉายภาพแบบใด?', choices: ['First-angle', 'Third-angle', 'Perspective', 'Oblique'], answer: 0, explain: 'ผู้มอง → วัตถุ → ระนาบฉาย คือ First-angle Projection' },
  { figure: 'third', q: 'จากแผนภาพนี้เป็นหลักการฉายภาพแบบใด?', choices: ['First-angle', 'Third-angle', 'Isometric', 'Section'], answer: 1, explain: 'ผู้มอง → ระนาบฉาย → วัตถุ คือ Third-angle Projection' },
  { figure: 'widthDepth', q: 'ถ้าต้องการดู “ความกว้างและความลึก” ควรใช้ภาพใด?', choices: ['Top View', 'Front View', 'Right View', 'Section View'], answer: 0, explain: 'Top View ช่วยให้เห็นมิติกว้างและลึกได้ชัดเจน' },
  { figure: 'heightDepth', q: 'ถ้าต้องการดู “ความสูงและความลึก” ควรใช้ภาพใด?', choices: ['Top View', 'Right View', 'Bottom View', 'แปลน'], answer: 1, explain: 'Right/Side View ใช้พิจารณาความสูงและความลึกของชิ้นงาน' },
  { figure: 'threeViews', q: 'ภาพชุดใดเป็นมุมมองพื้นฐานที่ใช้บ่อยในการเขียนภาพฉาย?', choices: ['หน้า–บน–ขวา', 'หน้า–หลัง–ล่าง', 'บน–ล่าง', 'ซ้าย–ขวาเท่านั้น'], answer: 0, explain: 'Front, Top และ Right View เป็นสามมุมมองพื้นฐานที่ใช้บ่อย' },
  { figure: 'chooseFront', q: 'ก่อนเริ่มเขียนภาพฉาย ควรพิจารณาสิ่งใดก่อน?', choices: ['เลือกด้านหน้าที่สื่อรูปร่างได้ชัด', 'ลงสีก่อน', 'วาดเส้นแบบสุ่ม', 'เขียนชื่อชิ้นงานอย่างเดียว'], answer: 0, explain: 'ควรเลือก Front View ที่แสดงลักษณะสำคัญของชิ้นงานได้ชัดเจนก่อน' },
] as const satisfies readonly { figure: FigureKind; q: string; choices: readonly string[]; answer: number; explain: string }[]

function Cube({ x, y, size = 34 }: { x: number; y: number; size?: number }) {
  const d = size * 0.45
  return <g>
    <polygon points={`${x},${y} ${x + size},${y} ${x + size + d},${y - d} ${x + d},${y - d}`} fill="#fed7aa" stroke="#166534" strokeWidth="2" />
    <polygon points={`${x},${y} ${x + d},${y - d} ${x + d},${y + size - d} ${x},${y + size}`} fill="#bbf7d0" stroke="#166534" strokeWidth="2" />
    <polygon points={`${x},${y} ${x + size},${y} ${x + size},${y + size} ${x},${y + size}`} fill="#bfdbfe" stroke="#166534" strokeWidth="2" />
  </g>
}

function DirectionFigure({ direction }: { direction: 'front' | 'top' | 'right' }) {
  return <svg viewBox="0 0 320 190" style={{ width: '100%', maxHeight: 220 }} role="img" aria-label={`มุมมอง ${direction}`}>
    <Cube x={126} y={82} size={54} />
    <Cube x={180} y={82} size={54} />
    <Cube x={180} y={28} size={54} />
    {direction === 'front' && <>
      <line x1="155" y1="175" x2="155" y2="142" stroke="#ef7d00" strokeWidth="7" strokeLinecap="round" />
      <polygon points="145,145 165,145 155,130" fill="#ef7d00" />
      <text x="155" y="187" textAnchor="middle" fontSize="13" fill="#9a3412">มองจากด้านหน้า</text>
    </>}
    {direction === 'top' && <>
      <line x1="164" y1="5" x2="164" y2="25" stroke="#ef7d00" strokeWidth="7" strokeLinecap="round" />
      <polygon points="154,22 174,22 164,37" fill="#ef7d00" />
      <text x="224" y="17" fontSize="13" fill="#9a3412">มองจากด้านบน</text>
    </>}
    {direction === 'right' && <>
      <line x1="302" y1="93" x2="254" y2="93" stroke="#ef7d00" strokeWidth="7" strokeLinecap="round" />
      <polygon points="262,82 262,104 246,93" fill="#ef7d00" />
      <text x="270" y="118" textAnchor="middle" fontSize="13" fill="#9a3412">มองจากด้านขวา</text>
    </>}
  </svg>
}

function FlatView({ title, shape }: { title: string; shape: 'front' | 'top' | 'right' }) {
  return <g>
    <rect x="4" y="4" width="92" height="72" rx="8" fill="#ffffff" stroke="#cbd5e1" />
    {shape === 'front' && <path d="M18 62V42H42V18H76V62Z" fill="#dcfce7" stroke="#166534" strokeWidth="2" />}
    {shape === 'top' && <path d="M18 18H78V60H54V42H18Z" fill="#dbeafe" stroke="#166534" strokeWidth="2" />}
    {shape === 'right' && <path d="M18 62V32H50V18H78V62Z" fill="#ffedd5" stroke="#166534" strokeWidth="2" />}
    <text x="50" y="72" textAnchor="middle" fontSize="9" fill="#374151">{title}</text>
  </g>
}

function ProjectionFigure({ kind }: { kind: FigureKind }) {
  if (kind === 'front' || kind === 'top' || kind === 'right') return <DirectionFigure direction={kind} />

  if (kind === 'first' || kind === 'third') {
    const first = kind === 'first'
    return <svg viewBox="0 0 320 170" style={{ width: '100%', maxHeight: 210 }}>
      <circle cx="45" cy="78" r="20" fill="#fed7aa" stroke="#9a3412" strokeWidth="3" />
      <circle cx="45" cy="78" r="6" fill="#9a3412" />
      {first
        ? <>
          <rect x="128" y="48" width="54" height="60" rx="5" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
          <line x1="250" y1="25" x2="250" y2="133" stroke="#2563eb" strokeWidth="7" />
          <text x="155" y="143" textAnchor="middle" fontSize="13">วัตถุ</text>
          <text x="250" y="153" textAnchor="middle" fontSize="13">ระนาบฉาย</text>
        </>
        : <>
          <line x1="132" y1="25" x2="132" y2="133" stroke="#2563eb" strokeWidth="7" />
          <rect x="222" y="48" width="54" height="60" rx="5" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
          <text x="132" y="153" textAnchor="middle" fontSize="13">ระนาบฉาย</text>
          <text x="249" y="143" textAnchor="middle" fontSize="13">วัตถุ</text>
        </>}
      <line x1="72" y1="78" x2={first ? 120 : 122} y2="78" stroke="#ef7d00" strokeWidth="6" strokeLinecap="round" />
      <polygon points={`${first ? 114 : 116},69 ${first ? 114 : 116},87 ${first ? 128 : 130},78`} fill="#ef7d00" />
      <text x="45" y="114" textAnchor="middle" fontSize="13">ผู้มอง</text>
    </svg>
  }

  if (kind === 'multi' || kind === 'threeViews') return <svg viewBox="0 0 320 210" style={{ width: '100%', maxHeight: 230 }}>
    <g transform="translate(8 10)"><FlatView title="FRONT" shape="front" /></g>
    <g transform="translate(110 10)"><FlatView title="TOP" shape="top" /></g>
    <g transform="translate(212 10)"><FlatView title="RIGHT" shape="right" /></g>
    <Cube x={120} y={145} size={42} />
    <line x1="155" y1="118" x2="155" y2="140" stroke="#ef7d00" strokeWidth="4" strokeDasharray="5 5" />
  </svg>

  if (kind === 'widthDepth') return <svg viewBox="0 0 320 190" style={{ width: '100%', maxHeight: 220 }}>
    <rect x="68" y="45" width="184" height="92" rx="8" fill="#dbeafe" stroke="#166534" strokeWidth="4" />
    <rect x="122" y="73" width="76" height="36" rx="5" fill="#fed7aa" stroke="#166534" strokeWidth="3" />
    <line x1="68" y1="156" x2="252" y2="156" stroke="#ef7d00" strokeWidth="5" />
    <text x="160" y="178" textAnchor="middle" fontSize="14">ความกว้าง</text>
    <line x1="277" y1="45" x2="277" y2="137" stroke="#2563eb" strokeWidth="5" />
    <text x="292" y="93" fontSize="14" transform="rotate(90 292 93)">ความลึก</text>
  </svg>

  if (kind === 'heightDepth') return <svg viewBox="0 0 320 190" style={{ width: '100%', maxHeight: 220 }}>
    <path d="M80 140V72H144V38H236V140Z" fill="#dcfce7" stroke="#166534" strokeWidth="4" />
    <line x1="54" y1="38" x2="54" y2="140" stroke="#ef7d00" strokeWidth="5" />
    <text x="38" y="92" fontSize="14" transform="rotate(-90 38 92)">ความสูง</text>
    <line x1="80" y1="160" x2="236" y2="160" stroke="#2563eb" strokeWidth="5" />
    <text x="158" y="182" textAnchor="middle" fontSize="14">ความลึก</text>
  </svg>

  return <svg viewBox="0 0 320 200" style={{ width: '100%', maxHeight: 230 }}>
    <Cube x={115} y={90} size={54} />
    <Cube x={169} y={90} size={54} />
    <Cube x={169} y={36} size={54} />
    <circle cx="155" cy="175" r="20" fill="#fff7ed" stroke="#ef7d00" strokeWidth="4" />
    <path d="M145 175H165M155 165V185" stroke="#ef7d00" strokeWidth="4" strokeLinecap="round" />
    <text x="155" y="198" textAnchor="middle" fontSize="13">เลือกด้านหน้าที่เห็นรูปร่างชัด</text>
  </svg>
}

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
        <h1 className="page-title">ตอบเร็วจากภาพ</h1>
        <p className="muted">ดูภาพก่อน แล้วเลือกคำตอบที่สัมพันธ์กับภาพ</p>
      </div>
      <div className="row">
        <span className="badge badge-gray">ข้อ {index + 1}/{QUESTIONS.length}</span>
        <span className="badge badge-orange">คะแนน {score}</span>
      </div>
    </div>

    <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
      <div style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%`, height: '100%', background: 'var(--green)' }} />
    </div>

    <div style={{
      borderRadius: 18,
      background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      border: '1px solid #e5e7eb',
      padding: 12,
      textAlign: 'center',
    }}>
      <ProjectionFigure kind={current.figure} />
    </div>

    <h2 style={{ lineHeight: 1.5, marginTop: 4 }}>{current.q}</h2>

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
`,
  'app/student/games/page.tsx': String.raw`import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

function MiniProjectionPreview() {
  return <svg viewBox="0 0 320 150" style={{ width: '100%', maxHeight: 150 }}>
    <polygon points="110,34 170,68 110,102 50,68" fill="#fed7aa" stroke="#166534" strokeWidth="3" />
    <polygon points="50,68 110,102 110,132 50,98" fill="#bbf7d0" stroke="#166534" strokeWidth="3" />
    <polygon points="170,68 110,102 110,132 170,98" fill="#bfdbfe" stroke="#166534" strokeWidth="3" />
    <rect x="206" y="28" width="82" height="50" rx="6" fill="#dcfce7" stroke="#166534" strokeWidth="3" />
    <path d="M216 68V52H238V38H270V68Z" fill="#fff" stroke="#166534" strokeWidth="2" />
    <line x1="182" y1="77" x2="202" y2="57" stroke="#ef7d00" strokeWidth="4" strokeDasharray="5 5" />
  </svg>
}

function MiniQuizPreview() {
  return <svg viewBox="0 0 320 150" style={{ width: '100%', maxHeight: 150 }}>
    <rect x="24" y="20" width="112" height="88" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M45 91V64H72V39H112V91Z" fill="#dcfce7" stroke="#166534" strokeWidth="3" />
    <line x1="80" y1="128" x2="80" y2="107" stroke="#ef7d00" strokeWidth="6" />
    <polygon points="71,110 89,110 80,97" fill="#ef7d00" />
    <rect x="168" y="30" width="126" height="32" rx="8" fill="#dcfce7" />
    <rect x="168" y="74" width="126" height="32" rx="8" fill="#ffedd5" />
    <text x="231" y="51" textAnchor="middle" fontSize="13" fill="#166534">A. Front View</text>
    <text x="231" y="95" textAnchor="middle" fontSize="13" fill="#9a3412">B. Top View</text>
  </svg>
}

export default async function StudentGamesPage() {
  const { user, profile } = await getCurrentUser()
  if (!user) redirect('/student/login?next=/student/games')
  if (profile?.role !== 'student') redirect('/student/login?next=/student/games')

  return <main className="student-content">
    <div className="student-content-inner stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <a className="btn btn-secondary btn-sm" href="/student/materials">← สื่อการสอน</a>
        <LogoutButton />
      </div>

      <section className="card stack" style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ margin: '0 auto' }}>🎮</div>
        <h1 className="page-title" style={{ marginBottom: 0 }}>เกมฝึกการเขียนภาพฉาย</h1>
        <p className="muted">เวอร์ชันภาพประกอบ — เรียนรู้จากภาพชิ้นงาน ทิศทางการมอง และภาพฉายจริง</p>
      </section>

      <div className="grid-2">
        <Link className="card stack" href="/student/games/matching" style={{ textDecoration: 'none', color: 'inherit' }}>
          <MiniProjectionPreview />
          <div>
            <span className="badge badge-orange">เกมที่ 1</span>
            <h2>จับคู่ภาพกับชื่อภาพฉาย</h2>
            <p className="muted">การ์ดภาพ 6 แบบ: Front, Top, Right, First-angle, Third-angle และ Isometric</p>
          </div>
          <span className="btn btn-primary">เริ่มเกมจับคู่</span>
        </Link>

        <Link className="card stack" href="/student/games/quiz" style={{ textDecoration: 'none', color: 'inherit' }}>
          <MiniQuizPreview />
          <div>
            <span className="badge badge-green">เกมที่ 2</span>
            <h2>ตอบเร็วจากภาพ</h2>
            <p className="muted">ทุกข้อมีภาพประกอบ เช่น ชิ้นงาน 3 มิติ ลูกศรทิศทาง และภาพฉายด้านต่าง ๆ</p>
          </div>
          <span className="btn btn-orange">เริ่มเกมตอบเร็ว</span>
        </Link>
      </div>
    </div>
  </main>
}
`
}

for (const [file, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), file)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf8')
  console.log(`✓ อัปเดต ${file}`)
}

console.log('')
console.log('✅ เพิ่มภาพประกอบให้เกมทั้ง 2 เกมเรียบร้อย')
console.log('ขั้นต่อไป: npm.cmd run build')
