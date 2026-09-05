import { NextResponse } from 'next/server'
import { getClientSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/clients/me
 * Retrieves the access token for the currently authenticated client.
 * Uses the custom JWT session cookie (independent of Supabase Auth).
 */
export async function GET() {
  try {
    // 1. Verify session from custom JWT cookie
    const session = await getClientSession()

    if (!session || !session.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    // 2. Fetch client by email
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, access_token')
      .eq('email', session.email.toLowerCase().trim())
      .maybeSingle()

    if (clientError) {
      console.error('[API clients/me] DB Error:', clientError)
      return NextResponse.json({ error: 'Error en la base de datos' }, { status: 500 })
    }

    if (!client) {
      return NextResponse.json(
        { error: 'No se encontraron turnos registrados para este correo.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      accessToken: client.access_token,
    })
  } catch (err) {
    console.error('[API clients/me] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
