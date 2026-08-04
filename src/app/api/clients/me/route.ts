import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/clients/me
 * Retrieves the access token for the currently authenticated client.
 * Securely uses the email of the active Supabase session.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    // 2. Fetch client by email
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, access_token')
      .eq('email', user.email.toLowerCase().trim())
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
