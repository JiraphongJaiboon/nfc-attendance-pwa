'use client'

import { useEffect, useState } from 'react'

export function OnlineStatus() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  if (online) return null
  return <div className="online-banner" role="status">ไม่มีอินเทอร์เน็ต — การเช็กชื่อ NFC ต้องเชื่อมต่ออินเทอร์เน็ต</div>
}
