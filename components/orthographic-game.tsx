'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './orthographic-game.module.css'

type ViewType = 'front' | 'top' | 'right'
type Matrix = number[][]
type ObjectDef = { id: string; title: string; heights: number[][] }
type RoundDef = { objectIndex: number; view: ViewType }

const OBJECTS: ObjectDef[] = [
  { id: 'A', title: 'ชิ้นงาน A', heights: [[0,1,0],[1,2,0],[1,1,1]] },
  { id: 'B', title: 'ชิ้นงาน B', heights: [[1,0,2],[1,1,2],[0,1,0]] },
  { id: 'C', title: 'ชิ้นงาน C', heights: [[0,2,1],[1,2,1],[1,0,0]] },
  { id: 'D', title: 'ชิ้นงาน D', heights: [[1,1,0],[0,2,2],[0,1,3]] },
  { id: 'E', title: 'ชิ้นงาน E', heights: [[2,0,0],[2,1,0],[1,1,1]] },
  { id: 'F', title: 'ชิ้นงาน F', heights: [[0,1,1],[0,1,2],[2,1,2]] },
]

const ROUNDS: RoundDef[] = [
  { objectIndex: 0, view: 'front' },
  { objectIndex: 1, view: 'top' },
  { objectIndex: 2, view: 'right' },
  { objectIndex: 3, view: 'front' },
  { objectIndex: 4, view: 'top' },
  { objectIndex: 5, view: 'right' },
  { objectIndex: 1, view: 'front' },
  { objectIndex: 3, view: 'top' },
  { objectIndex: 5, view: 'front' },
  { objectIndex: 2, view: 'top' },
]

const VIEW_LABEL: Record<ViewType, string> = {
  front: 'ภาพฉายด้านหน้า',
  top: 'ภาพฉายด้านบน',
  right: 'ภาพฉายด้านขวา',
}

const EXPLANATION: Record<ViewType, string> = {
  front: 'มองตรงจากด้านหน้า แล้วใช้ความสูงสูงสุดของก้อนในแต่ละแนวซ้าย–ขวา',
  top: 'มองลงจากด้านบน ตำแหน่งที่มีก้อนอย่างน้อย 1 ก้อนจะปรากฏในภาพฉาย',
  right: 'มองจากด้านขวา แล้วใช้ความสูงสูงสุดของก้อนในแต่ละแนวหน้า–หลัง',
}

function maxHeight(object: ObjectDef) {
  return Math.max(1, ...object.heights.flat())
}

function frontProjection(object: ObjectDef): Matrix {
  const height = maxHeight(object)
  const width = object.heights[0].length
  const columns = Array.from({ length: width }, (_, x) => Math.max(...object.heights.map((row) => row[x])))
  return Array.from({ length: height }, (_, row) => {
    const level = height - row
    return columns.map((h) => h >= level ? 1 : 0)
  })
}

function topProjection(object: ObjectDef): Matrix {
  return object.heights.map((row) => row.map((h) => h > 0 ? 1 : 0))
}

function rightProjection(object: ObjectDef): Matrix {
  const height = maxHeight(object)
  const rowsFrontToBack = [...object.heights].reverse()
  const columns = rowsFrontToBack.map((row) => Math.max(...row))
  return Array.from({ length: height }, (_, row) => {
    const level = height - row
    return columns.map((h) => h >= level ? 1 : 0)
  })
}

function projection(object: ObjectDef, view: ViewType): Matrix {
  if (view === 'front') return frontProjection(object)
  if (view === 'top') return topProjection(object)
  return rightProjection(object)
}

function matrixKey(matrix: Matrix) {
  return matrix.map((row) => row.join('')).join('|')
}

function normalizeMatrix(matrix: Matrix): Matrix {
  const width = Math.max(...matrix.map((row) => row.length))
  return matrix.map((row) => [...row, ...Array(width - row.length).fill(0)])
}

function mutate(matrix: Matrix, seed: number): Matrix {
  const next = matrix.map((row) => [...row])
  const cells = next.length * next[0].length
  for (let i = 0; i < cells; i++) {
    const index = (seed * 3 + i * 5 + 1) % cells
    const r = Math.floor(index / next[0].length)
    const c = index % next[0].length
    next[r][c] = next[r][c] ? 0 : 1
    if (next.some((row) => row.some(Boolean)) && matrixKey(next) !== matrixKey(matrix)) return next
    next[r][c] = next[r][c] ? 0 : 1
  }
  return next
}

function buildChoices(roundIndex: number, object: ObjectDef, view: ViewType) {
  const correct = normalizeMatrix(projection(object, view))
  const candidates: Matrix[] = [correct]
  const add = (matrix: Matrix) => {
    const normalized = normalizeMatrix(matrix)
    if (!candidates.some((item) => matrixKey(item) === matrixKey(normalized))) candidates.push(normalized)
  }

  ;(['front', 'top', 'right'] as ViewType[]).forEach((other) => { if (other !== view) add(projection(object, other)) })
  add(mutate(correct, roundIndex + 1))
  add(projection(OBJECTS[(roundIndex + 2) % OBJECTS.length], view))
  add(mutate(correct, roundIndex + 7))

  const four = candidates.slice(0, 4)
  const shift = roundIndex % four.length
  return [...four.slice(shift), ...four.slice(0, shift)].map((matrix, index) => ({
    id: `${roundIndex}-${index}-${matrixKey(matrix)}`,
    matrix,
    correct: matrixKey(matrix) === matrixKey(correct),
  }))
}

export function OrthographicGame() {
  const [roundIndex, setRoundIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false)
  const [finished, setFinished] = useState(false)
  const [bestScore, setBestScore] = useState(0)

  const round = ROUNDS[roundIndex]
  const object = OBJECTS[round.objectIndex]
  const choices = useMemo(() => buildChoices(roundIndex, object, round.view), [roundIndex, object, round.view])

  useEffect(() => {
    const stored = Number(localStorage.getItem('orthographic-game-best') || '0')
    if (Number.isFinite(stored)) setBestScore(stored)
  }, [])

  function choose(id: string, correct: boolean) {
    if (selectedId) return
    setSelectedId(id)
    setAnsweredCorrectly(correct)
    if (correct) setScore((value) => value + 10)
  }

  function next() {
    if (roundIndex >= ROUNDS.length - 1) {
      const finalScore = score + (answeredCorrectly ? 0 : 0)
      const nextBest = Math.max(bestScore, finalScore)
      setBestScore(nextBest)
      localStorage.setItem('orthographic-game-best', String(nextBest))
      setFinished(true)
      return
    }
    setRoundIndex((value) => value + 1)
    setSelectedId('')
    setAnsweredCorrectly(false)
  }

  function restart() {
    setRoundIndex(0)
    setScore(0)
    setSelectedId('')
    setAnsweredCorrectly(false)
    setFinished(false)
  }

  if (finished) {
    return <section className={styles.finish}>
      <div className={styles.finishIcon}>🏆</div>
      <h2>จบเกมแล้ว</h2>
      <p>คะแนนของคุณ</p>
      <div className={styles.finalScore}>{score} / {ROUNDS.length * 10}</div>
      <p className="muted">คะแนนสูงสุดบนอุปกรณ์นี้: {bestScore}</p>
      <button className={styles.primary} onClick={restart}>เล่นอีกครั้ง</button>
    </section>
  }

  const progress = ((roundIndex + 1) / ROUNDS.length) * 100

  return <div className={styles.game}>
    <section className={styles.hero}>
      <div>
        <span className="badge badge-orange">Orthographic Projection</span>
        <h1>เกมการเขียนภาพฉาย</h1>
        <p>มองชิ้นงาน 3 มิติ แล้วเลือกภาพฉายที่ถูกต้อง</p>
      </div>
      <div className={styles.scoreBox}><span>คะแนน</span><strong>{score}</strong></div>
    </section>

    <div className={styles.legend}>
      <div><strong>ด้านหน้า</strong>มองตรงจากคำว่า FRONT</div>
      <div><strong>ด้านบน</strong>มองลงจากด้านบนของชิ้นงาน</div>
      <div><strong>ด้านขวา</strong>มองจากทางขวามือของชิ้นงาน</div>
    </div>

    <div className={styles.progress} aria-label={`ข้อ ${roundIndex + 1} จาก ${ROUNDS.length}`}><span style={{ width: `${progress}%` }} /></div>

    <section className={styles.questionCard}>
      <div className={styles.questionHead}>
        <div>
          <span className={styles.viewBadge}>ข้อ {roundIndex + 1} / {ROUNDS.length}</span>
          <h2>เลือก {VIEW_LABEL[round.view]} ของ {object.title}</h2>
        </div>
      </div>

      <div className={styles.stage}>
        <IsoObject object={object} />
      </div>

      <div className={styles.choices}>
        {choices.map((choice, index) => {
          const selected = selectedId === choice.id
          const revealCorrect = Boolean(selectedId) && choice.correct
          const className = `${styles.choice} ${revealCorrect ? styles.choiceCorrect : ''} ${selected && !choice.correct ? styles.choiceWrong : ''}`
          return <button key={choice.id} className={className} disabled={Boolean(selectedId)} onClick={() => choose(choice.id, choice.correct)}>
            <span className={styles.choiceLabel}>ตัวเลือก {String.fromCharCode(65 + index)}</span>
            <ProjectionDiagram matrix={choice.matrix} />
          </button>
        })}
      </div>

      {selectedId && <div className={`${styles.feedback} ${answeredCorrectly ? styles.good : styles.bad}`}>
        {answeredCorrectly ? '✅ ถูกต้อง +10 คะแนน' : '❌ ยังไม่ถูก ลองสังเกตแนวความสูงและตำแหน่งของก้อน'}
        <div className={styles.explain}>{EXPLANATION[round.view]}</div>
      </div>}

      <div className={styles.actions}>
        {selectedId && <button className={styles.primary} onClick={next}>{roundIndex === ROUNDS.length - 1 ? 'ดูคะแนนรวม' : 'ข้อต่อไป'}</button>}
      </div>
    </section>
  </div>
}

function ProjectionDiagram({ matrix }: { matrix: Matrix }) {
  const rows = matrix.length
  const cols = matrix[0]?.length || 1
  const size = Math.min(25, 88 / Math.max(rows, cols))
  const width = cols * size
  const height = rows * size
  const x0 = (150 - width) / 2
  const y0 = (105 - height) / 2

  return <svg className={styles.projection} viewBox="0 0 150 105" role="img" aria-label="ตัวเลือกภาพฉาย">
    {matrix.map((row, r) => row.map((cell, c) => <rect
      key={`${r}-${c}`}
      x={x0 + c * size}
      y={y0 + r * size}
      width={size}
      height={size}
      fill={cell ? '#344054' : '#ffffff'}
      stroke="#98a2b3"
      strokeWidth="1.4"
    />))}
  </svg>
}

function IsoObject({ object }: { object: ObjectDef }) {
  const cubes: Array<{ x: number; y: number; z: number }> = []
  object.heights.forEach((row, y) => row.forEach((height, x) => {
    for (let z = 0; z < height; z++) cubes.push({ x, y, z })
  }))
  cubes.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.z - b.z || a.x - b.x)

  const tw = 40
  const th = 20
  const ch = 30
  const ox = 220
  const oy = 92

  return <svg className={styles.isoSvg} viewBox="0 0 440 260" role="img" aria-label="ชิ้นงานสามมิติสร้างจากลูกบาศก์">
    <defs>
      <linearGradient id="topFace" x1="0" x2="1"><stop offset="0" stopColor="#f7a86c"/><stop offset="1" stopColor="#ffd2b1"/></linearGradient>
      <linearGradient id="leftFace" x1="0" x2="1"><stop offset="0" stopColor="#14703a"/><stop offset="1" stopColor="#249654"/></linearGradient>
      <linearGradient id="rightFace" x1="0" x2="1"><stop offset="0" stopColor="#1c8450"/><stop offset="1" stopColor="#35ad6d"/></linearGradient>
    </defs>
    <ellipse cx="220" cy="211" rx="128" ry="22" fill="#101828" opacity=".08" />
    {cubes.map((cube) => {
      const bx = ox + (cube.x - cube.y) * (tw / 2)
      const by = oy + (cube.x + cube.y) * (th / 2) - cube.z * ch
      const topY = by - ch
      const top = `${bx},${topY - th/2} ${bx + tw/2},${topY} ${bx},${topY + th/2} ${bx - tw/2},${topY}`
      const left = `${bx - tw/2},${topY} ${bx},${topY + th/2} ${bx},${by + th/2} ${bx - tw/2},${by}`
      const right = `${bx + tw/2},${topY} ${bx},${topY + th/2} ${bx},${by + th/2} ${bx + tw/2},${by}`
      const key = `${cube.x}-${cube.y}-${cube.z}`
      return <g key={key} stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round">
        <polygon points={left} fill="url(#leftFace)" />
        <polygon points={right} fill="url(#rightFace)" />
        <polygon points={top} fill="url(#topFace)" />
      </g>
    })}
    <g fontFamily="Tahoma, Arial" fontSize="13" fontWeight="700" fill="#344054">
      <text x="205" y="242">FRONT</text>
      <path d="M220 230 L220 211" stroke="#f36b21" strokeWidth="3" markerEnd="url(#none)" />
      <polygon points="220,204 215,214 225,214" fill="#f36b21" />
      <text x="351" y="161">RIGHT</text>
      <path d="M340 158 L316 150" stroke="#167c3a" strokeWidth="3" />
      <polygon points="310,148 320,146 317,156" fill="#167c3a" />
    </g>
  </svg>
}
