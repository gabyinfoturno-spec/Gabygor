import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ClientDbRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  access_token: string
  created_at: string
  updated_at: string
  appointments?: { id: string }[]
}

/**
 * GET /api/admin/clients
 * Lists all clients with appointment counts.
 * Admin authenticated only.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    // 2. Fetch clients with appointments count
    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('*, appointments(id)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API Admin Clients GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
    }

    const clientsWithCount = (clients as unknown as ClientDbRow[])?.map((client) => {
      const appointments = client.appointments || []
      const rest = { ...client }
      delete rest.appointments
      return {
        ...rest,
        appointment_count: appointments.length,
      }
    })

    return NextResponse.json(clientsWithCount ?? [])
  } catch (err) {
    console.error('[API Admin Clients GET] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
