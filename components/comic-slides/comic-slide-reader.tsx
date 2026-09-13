'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import styles from './comic.module.css'

type Payload={material:{title:string;description:string;mimeType:string|null};pages:{pageNo:number;url:string;fileName:string}[];fallbackUrl:string|null}
export function ComicSlideReader({materialId}:{materialId:string}){
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[current,setCurrent]=useState(1)
  const refs=useRef<Record<number,HTMLImageElement|null>>({})
  useEffect(()=>{(async()=>{try{const r=await fetch(`/api/student/slides/${encodeURIComponent(materialId)}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'โหลดสไลด์ไม่สำเร็จ');setData(d)}catch(e){setError(e instanceof Error?e.message:'โหลดสไลด์ไม่สำเร็จ')}})()},[materialId])
  useEffect(()=>{if(!data?.pages.length)return;const obs=new IntersectionObserver((entries)=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){const n=Number((visible.target as HTMLElement).dataset.page||1);setCurrent(n)}},{threshold:[.25,.5,.75]});Object.values(refs.current).forEach(el=>el&&obs.observe(el));return()=>obs.disconnect()},[data])
  if(error)return <main className={styles.readerShell}><div className={styles.empty}>{error}<div style={{marginTop:16}}><Link href="/student/materials">กลับสื่อการสอน</Link></div></div></main>
  if(!data)return <main className={styles.readerShell}><div className={styles.empty}>กำลังโหลดสไลด์…</div></main>
  return <main className={styles.readerShell}><header className={styles.readerTop}><Link href="/student/materials">← สื่อการสอน</Link><strong>{data.material.title}</strong><span className={styles.progress}>{data.pages.length?`${current} / ${data.pages.length}`:'เอกสาร'}</span></header>{data.material.description&&<div className={styles.desc}>{data.material.description}</div>}{data.pages.length?<div className={styles.reader}>{data.pages.map(p=><img key={p.pageNo} data-page={p.pageNo} ref={el=>{refs.current[p.pageNo]=el}} className={styles.page} loading={p.pageNo<=2?'eager':'lazy'} src={p.url} alt={`${data.material.title} หน้า ${p.pageNo}`}/>)}</div>:data.fallbackUrl?<div className={styles.reader}><iframe src={data.fallbackUrl} title={data.material.title} style={{width:'100%',height:'82vh',border:0,background:'white'}}/><div style={{textAlign:'center',padding:16}}><a href={data.fallbackUrl} target="_blank" rel="noreferrer" style={{color:'white'}}>เปิดเอกสารเต็มหน้าจอ ↗</a></div></div>:<div className={styles.empty}>สไลด์นี้ยังไม่มีหน้าให้อ่าน</div>}</main>
}
