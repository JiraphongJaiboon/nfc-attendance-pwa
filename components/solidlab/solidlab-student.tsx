'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './solidlab.module.css'

type Topic = { id:string; slug:string; tag:string; num:string; title:string; subtitle:string; info:string; shape_key:'cube'|'prism'|'cylinder'|'sphere'; game_type:'spin'|'fold' }
type Question = { id:string; gameType:'spin'|'fold'; prompt:string; options:string[]; hint:string }

type TopicsPayload = { classroom:{name:string}; student:{name:string}; topics:Topic[]; topicScores:Record<string,number>; totalScore:number }

export function SolidLabStudent() {
  const [payload, setPayload] = useState<TopicsPayload | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [result, setResult] = useState<{correct:boolean;correctAnswer:string;explanation:string}|null>(null)
  const [loading, setLoading] = useState(true)
  const [gameLoading, setGameLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalScore, setTotalScore] = useState(0)
  const [rotation, setRotation] = useState({x:-18,y:24})
  const [auto, setAuto] = useState(true)
  const [showNet, setShowNet] = useState(false)
  const drag = useRef<{id:number;x:number;y:number}|null>(null)

  useEffect(() => { void loadTopics() }, [])
  async function loadTopics() {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/student/solidlab?action=topics', { cache:'no-store' })
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'โหลด SolidLab ไม่สำเร็จ')
      setPayload(d); setTotalScore(d.totalScore ?? 0); setSelectedId((v) => v || d.topics?.[0]?.id || '')
    } catch(e) { setError(e instanceof Error ? e.message : 'โหลด SolidLab ไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  const topic = useMemo(() => payload?.topics.find((t) => t.id === selectedId) ?? null, [payload, selectedId])

  function cycleKey() { return topic ? `nfc-solidlab-cycle-${topic.id}` : '' }
  function usedIds() { try { return JSON.parse(sessionStorage.getItem(cycleKey()) || '[]') as string[] } catch { return [] } }

  async function nextQuestion() {
    if (!topic) return
    setGameLoading(true); setResult(null); setQuestion(null)
    try {
      const used = usedIds()
      const r = await fetch(`/api/student/solidlab?action=question&topicId=${encodeURIComponent(topic.id)}&exclude=${encodeURIComponent(used.join(','))}`, { cache:'no-store' })
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'โหลดคำถามไม่สำเร็จ')
      const nextUsed = d.cycleReset ? [d.question.id] : [...used, d.question.id]
      sessionStorage.setItem(cycleKey(), JSON.stringify(nextUsed))
      setQuestion(d.question); setShowNet(d.question.gameType === 'fold'); setAuto(d.question.gameType !== 'fold')
    } catch(e) { setError(e instanceof Error ? e.message : 'โหลดคำถามไม่สำเร็จ') }
    finally { setGameLoading(false) }
  }

  async function answer(value:string) {
    if (!question || result) return
    try {
      const r = await fetch('/api/student/solidlab', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'answer', questionId:question.id, answer:value }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'ตรวจคำตอบไม่สำเร็จ')
      setResult({ correct:d.correct, correctAnswer:d.correctAnswer, explanation:d.explanation || '' }); setTotalScore(d.totalScore ?? totalScore)
    } catch(e) { setError(e instanceof Error ? e.message : 'ตรวจคำตอบไม่สำเร็จ') }
  }

  function pointerDown(e:React.PointerEvent<HTMLDivElement>) { drag.current={id:e.pointerId,x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture?.(e.pointerId); setAuto(false) }
  function pointerMove(e:React.PointerEvent<HTMLDivElement>) { if (!drag.current || drag.current.id!==e.pointerId) return; const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y; drag.current={id:e.pointerId,x:e.clientX,y:e.clientY}; setRotation((r)=>({x:Math.max(-70,Math.min(70,r.x-dy*.45)),y:r.y+dx*.65})) }
  function pointerUp(){ drag.current=null }

  if (loading) return <div className="loading">กำลังโหลดห้องทดลอง 3D…</div>
  if (error && !payload) return <div className="message message-error">{error}</div>
  if (!payload) return null

  return <div className={styles.lab}>
    <section className={styles.hero}>
      <div className={styles.heroTop}><div><div style={{opacity:.8,fontWeight:800,letterSpacing:'.1em'}}>SOLID GEOMETRY LAB</div><h1>ห้องทดลอง 3D + มินิเกม</h1><div>{payload.classroom.name} · {payload.student.name}</div></div><div className={styles.score}><span>คะแนนสะสม</span><strong>{totalScore}</strong></div></div>
      <div className={styles.actions}><Link className={styles.secondary} href="/student/materials">← สื่อการสอน</Link><Link className={styles.secondary} href="/student/materials">สไลด์ / เอกสาร</Link></div>
    </section>

    {error && <div className="message message-error">{error}</div>}
    {payload.topics.length ? <div className={styles.topicGrid}>{payload.topics.map((t)=><button key={t.id} className={`${styles.topicCard} ${selectedId===t.id?styles.topicActive:''}`} onClick={()=>{setSelectedId(t.id);setQuestion(null);setResult(null);setShowNet(false);setAuto(true)}}><div className={styles.topicNum}>UNIT {t.num || '--'} · {t.tag || t.slug}</div><h3>{t.title}</h3><p>{t.info}</p><div style={{marginTop:8,fontWeight:800,color:'#198754'}}>คะแนน {payload.topicScores[t.id] ?? 0}</div></button>)}</div> : <div className="card empty">ครูยังไม่ได้เปิดบทเรียน SolidLab สำหรับห้องนี้</div>}

    {topic && <section className={styles.stageCard}>
      <div style={{marginBottom:12}}><div style={{opacity:.75,fontSize:13}}>UNIT {topic.num} · {topic.tag}</div><h2 style={{margin:'3px 0'}}>{topic.title}</h2><div style={{opacity:.8}}>{topic.subtitle}</div></div>
      <div className={styles.stage} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        {showNet ? <div className={styles.net}>{[1,2,3,4,5,6].map(n=><span key={n}>หน้า {n}</span>)}</div> : <Shape topic={topic} rotation={rotation} auto={auto} />}
      </div>
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={()=>{setAuto(false);setRotation(r=>({...r,y:r.y-45}))}}>↶ หมุนซ้าย</button>
        <button className={styles.controlBtn} onClick={()=>{setAuto(false);setRotation(r=>({...r,y:r.y+45}))}}>หมุนขวา ↷</button>
        <button className={styles.controlBtn} onClick={()=>{setShowNet(v=>!v);setAuto(false)}}>{showNet?'▣ กลับเป็นทรงตัน':'⌑ คลี่ / เส้นโครง'}</button>
        <button className={styles.controlBtn} onClick={()=>{setShowNet(false);setAuto(v=>!v)}}>{auto?'⏸ หยุดหมุน':'▶ หมุนอัตโนมัติ'}</button>
      </div>

      <div className={styles.game}>
        {!question ? <><h3 style={{marginTop:0}}>ฝึกคิดแบบ 3 มิติ</h3><p className={styles.hint}>คำถามจะไม่ซ้ำจนกว่าจะครบชุด และคะแนนถูกบันทึกใน Supabase</p><button className={styles.primary} disabled={gameLoading} onClick={nextQuestion}>{gameLoading?'กำลังสุ่มโจทย์…':'เริ่มมินิเกม'}</button></> : <>
          <div className={styles.prompt}>{question.prompt}</div>
          <div className={styles.hint}>{question.hint ? `คำใบ้: ${question.hint}` : 'เลือกคำตอบที่ถูกต้อง'}</div>
          <div className={styles.options}>{question.options.map((option)=>{const cls=result?(option===result.correctAnswer?styles.correct:(!result.correct&&undefined)):'';return <button key={option} className={`${styles.option} ${cls||''}`} disabled={Boolean(result)} onClick={()=>answer(option)}>{option}</button>})}</div>
          {result && <div className={styles.result}>{result.correct ? '✅ ถูกต้อง +10 คะแนน' : `❌ ยังไม่ถูก คำตอบที่ถูกคือ “${result.correctAnswer}”`}{result.explanation ? <div style={{marginTop:5}}>{result.explanation}</div> : null}</div>}
          <div className={styles.actions}>{result && <button className={styles.primary} onClick={nextQuestion}>คำถามถัดไป</button>}<button className={styles.secondary} onClick={()=>{setQuestion(null);setResult(null)}}>จบเกม</button></div>
        </>}
      </div>
    </section>}
  </div>
}

function Shape({topic,rotation,auto}:{topic:Topic;rotation:{x:number;y:number};auto:boolean}) {
  const style = auto ? undefined : { transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }
  if (topic.shape_key === 'sphere') return <div className={`${styles.objectWrap} ${auto?styles.autoSpin:''}`} style={style}><div className={styles.sphere}/></div>
  if (topic.shape_key === 'cylinder') return <div className={`${styles.objectWrap} ${auto?styles.autoSpin:''}`} style={style}><div className={styles.cylinder}/></div>
  return <div className={`${styles.objectWrap} ${auto?styles.autoSpin:''}`} style={style}><div className={`${styles.cube} ${topic.shape_key==='prism'?styles.prism:''}`}>{[['front','△'],['back','△'],['right','▭'],['left','▭'],['top','▭'],['bottom','▭']].map(([name,icon])=><div key={name} className={`${styles.face} ${styles[name as keyof typeof styles]}`}>{topic.shape_key==='prism'?icon:'◫'}</div>)}</div></div>
}
