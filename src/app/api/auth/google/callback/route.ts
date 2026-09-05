import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================
// GET /api/auth/google/callback
// Recibe el código de Google, intercambia por tokens,
// obtiene datos del usuario, crea sesión JWT propia y redirige.
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Error devuelto por Google (ej: acceso denegado)
  if (errorParam) {
    console.error('[OAuth Callback] Google error:', errorParam)
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorParam)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_params`)
  }

  // Verificar state (anti-CSRF)
  const savedState = request.cookies.get('gabygor_oauth_state')?.value
  if (!savedState || savedState !== state) {
    console.warn('[OAuth Callback] State mismatch')
    return NextResponse.redirect(`${origin}/?auth_error=invalid_state`)
  }

  // Decodificar `next` del state
  let nextPath = '/'
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    nextPath = decoded.next || '/'
  } catch {
    nextPath = '/'
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${origin}/api/auth/google/callback`

    // 1. Intercambiar código por access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('[OAuth Callback] Token exchange error:', tokenData)
      return NextResponse.redirect(`${origin}/?auth_error=token_exchange_failed`)
    }

    // 2. Obtener info del usuario de Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const googleUser = await userRes.json()

    if (!userRes.ok || !googleUser.email) {
      console.error('[OAuth Callback] Userinfo error:', googleUser)
      return NextResponse.redirect(`${origin}/?auth_error=userinfo_failed`)
    }

    const email: string = googleUser.email.toLowerCase().trim()
    const name: string = googleUser.name || googleUser.given_name || email.split('@')[0]
    const picture: string = googleUser.picture || ''

    // 3. Upsert del cliente en la tabla clients
    const supabase = createAdminClient()
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, access_token')
      .eq('email', email)
      .maybeSingle()

    if (!existingClient) {
      // Crear cliente nuevo
      await supabase.from('clients').insert({ full_name: name, email })
    } else {
      // Actualizar nombre si cambió
      await supabase.from('clients').update({ full_name: name }).eq('id', existingClient.id)
    }

    // 4. Crear JWT de sesión propio
    const token = await createSessionToken({ email, name, picture })

    // 5. Respuesta con cookie de sesión + borrar cookie de state
    const response = NextResponse.redirect(`${origin}${nextPath}`)
    response.cookies.set('gabygor_client_session', token, getSessionCookieOptions())
    response.cookies.delete('gabygor_oauth_state')

    return response
  } catch (err) {
    console.error('[OAuth Callback] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/?auth_error=server_error`)
  }
}
