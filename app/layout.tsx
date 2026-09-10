import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from '@/components/pwa-register'
import { OnlineStatus } from '@/components/online-status'

export const metadata: Metadata = {
  title: 'NFC Attendance | โรงเรียนเทศบาล ๔ (เพาะชำ)',
  description: 'ระบบเช็กชื่อนักเรียนด้วย NFC แยกตามห้องเรียน',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'NFC Attendance' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#167c3a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        {children}
        <PwaRegister />
        <OnlineStatus />
      </body>
    </html>
  )
}
