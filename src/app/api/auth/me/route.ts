import { NextResponse } from 'next/server'
import { getClientSession } from '@/lib/auth/session'

// ============================================================
// GET /api/auth/me
// Devuelve la sesión del cliente autenticado (desde JWT cookie)
// ============================================================

export async function GET() {
  const session = await getClientSession()

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({ user: session })
}
