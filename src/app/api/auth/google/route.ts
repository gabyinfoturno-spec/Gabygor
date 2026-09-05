import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// ============================================================
// GET /api/auth/google
// Inicia el flujo OAuth con Google redirigiendo al authorization endpoint.
// Parámetro `next` indica a dónde volver después del login.
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') || '/'

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth no configurado' }, { status: 500 })
  }

  // Redirect URI según entorno
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${origin}/api/auth/google/callback`

  // State: codifica el `next` para recuperarlo en el callback (anti-CSRF básico)
  const state = Buffer.from(JSON.stringify({ next, ts: Date.now() })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  const response = NextResponse.redirect(googleAuthUrl)

  // Guardar state en cookie temporal para verificarlo en el callback
  response.cookies.set('gabygor_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutos
    path: '/',
  })

  return response
}
