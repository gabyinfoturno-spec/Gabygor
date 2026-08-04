import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/availability/dates
 * Retorna las fechas con disponibilidad para un servicio dado.
 *
 * Query params:
 *   - serviceId: UUID del servicio (requerido)
 *   - startDate: Fecha de inicio (YYYY-MM-DD, opcional, default: hoy)
 *   - endDate:   Fecha de fin (YYYY-MM-DD, opcional, default: hoy + 30 días)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'El parámetro serviceId es requerido' },
        { status: 400 }
      )
    }

    // Usamos el cliente de admin para evitar llamar a cookies() en un endpoint público
    const supabase = createAdminClient()

    // 1. Obtener la hora/fecha actual en Argentina
    const argentinaToday = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    // 2. Verificar si se permite reservar en el día actual
    const { data: sameDaySetting } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'allow_same_day_booking')
      .maybeSingle()

    const allowSameDay = sameDaySetting?.setting_value !== 'false'

    let startDate = startDateParam || argentinaToday

    // Si no se permite mismo día y la fecha de inicio es hoy, mover a mañana
    if (!allowSameDay && startDate === argentinaToday) {
      const tomorrowDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      startDate = tomorrowDate.toLocaleDateString('sv-SE', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    }

    // 3. Obtener el límite máximo de días permitidos para reservar por adelantado
    const { data: maxDaysSetting } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'max_days_advance_booking')
      .maybeSingle()

    const maxDays = maxDaysSetting?.setting_value ? parseInt(maxDaysSetting.setting_value, 10) : 30

    let endDate: string
    if (endDateParam) {
      endDate = endDateParam
    } else {
      const baseDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
      baseDate.setDate(baseDate.getDate() + maxDays)
      endDate = baseDate.toLocaleDateString('sv-SE', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    }

    // Llamar a la función RPC de Supabase
    const { data, error } = await supabase.rpc('get_available_dates', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_service_id: serviceId,
    })

    if (error) {
      console.error('[API /availability/dates] Error RPC:', error)
      return NextResponse.json(
        { error: 'Error al obtener fechas disponibles' },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=5',
      },
    })
  } catch (err) {
    console.error('[API /availability/dates] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
