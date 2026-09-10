@echo off
chcp 65001 > nul
title NFC Attendance PWA
cd /d %~dp0

echo ============================================
echo   NFC Attendance PWA - Development Server
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ไม่พบ Node.js กรุณาติดตั้ง Node.js LTS ก่อน
  echo https://nodejs.org/
  pause
  exit /b 1
)

if not exist .env.local (
  copy .env.example .env.local >nul
  echo [IMPORTANT] สร้างไฟล์ .env.local จากตัวอย่างแล้ว
  echo กรุณาเปิด .env.local ใส่ค่าจาก Supabase แล้วรันไฟล์นี้ใหม่
  start notepad .env.local
  pause
  exit /b 0
)

if not exist node_modules (
  echo กำลังติดตั้ง dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo เปิดเว็บที่ http://localhost:3000
echo กด Ctrl+C เพื่อหยุด Server
call npm run dev
if errorlevel 1 goto :error
exit /b 0

:error
echo.
echo เกิดข้อผิดพลาด กรุณาอ่านข้อความด้านบน
pause
exit /b 1
