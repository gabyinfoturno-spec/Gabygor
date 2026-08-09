import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientPortalUrl } from '@/lib/utils'

/**
 * GET /api/payments/appointment-access?appointmentId=...
 * Devuelve el accessUrl del cliente para el turno dado.
 * Usado por la página /pago/resultado para generar el link de "Ver mis turnos".
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('appointments')
      .select('clients (access_token)')
      .eq('id', appointmentId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    const clientRaw = data.clients
    const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { access_token: string } | null
    if (!client?.access_token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ accessUrl: getClientPortalUrl(client.access_token) })
  } catch (err) {
    console.error('[appointment-access] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
