import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/working-hours
 * Fetches all working hours.
 * Public or admin, let's keep it public for booking flow availability check, 
 * but allow admin actions. 
 * Actually, the booking flow uses RPC function get_available_dates and get_available_slots, 
 * so it doesn't query this API directly. 
 * But let's keep GET public just in case, or protect it. Let's make it public.
 */
export async function GET() {
  try {
    const supabase = createAdminClient() // use admin client to ensure we get the config

    const { data: workingHours, error } = await supabase
      .from('working_hours')
      .select('*')
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error('[API Working Hours GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener horarios' }, { status: 500 })
    }

    return NextResponse.json(workingHours ?? [])
  } catch (err) {
    console.error('[API Working Hours GET] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/working-hours
 * Updates working hours (upsert array).
 * Admin authenticated only.
 */
export async function PUT(request: NextRequest) {
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

    // 2. Parse body (expect array of days)
    const body = await request.json()
    const workingHoursList = body // Array of { id?, day_of_week, is_working_day, start_time, end_time, interval_minutes }

    if (!Array.isArray(workingHoursList)) {
      return NextResponse.json({ error: 'Se esperaba una lista de horarios' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 3. Upsert into database
    const { data, error: upsertError } = await supabaseAdmin
      .from('working_hours')
      .upsert(
        workingHoursList.map((day) => ({
          ...(day.id ? { id: day.id } : {}),
          day_of_week: day.day_of_week,
          is_working_day: day.is_working_day,
          start_time: day.is_working_day ? day.start_time : null,
          end_time: day.is_working_day ? day.end_time : null,
          interval_minutes: day.interval_minutes,
        })),
        { onConflict: 'day_of_week' }
      )
      .select()

    if (upsertError) {
      console.error('[API Working Hours PUT] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Error al guardar configuración de horarios' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[API Working Hours PUT] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
