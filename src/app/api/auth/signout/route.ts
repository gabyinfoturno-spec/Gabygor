import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

// ============================================================
// POST /api/auth/signout
// Destruye la cookie de sesión del cliente
// ============================================================

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // expira inmediatamente
    path: '/',
  })
  return response
}
