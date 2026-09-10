'use client'

import { useState } from 'react'

export function LogoutButton({ className = 'btn btn-secondary' }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  return <button className={className} disabled={loading} onClick={async () => {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => undefined)
    window.location.href = '/'
  }}>{loading ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}</button>
}
