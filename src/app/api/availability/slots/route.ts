import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/availability/slots
 * Retorna los horarios disponibles para una fecha y servicio(s) dados.
 *
 * Query params:
 *   - date:       Fecha (YYYY-MM-DD, requerido)
 *   - serviceId:  UUID del servicio primario (opcional si se pasa serviceIds)
 *   - serviceIds: UUIDs de servicios separados por comas (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const serviceId = searchParams.get('serviceId')
    const serviceIdsParam = searchParams.get('serviceIds')

    if (!date || (!serviceId && !serviceIdsParam)) {
      return NextResponse.json(
        { error: 'Los parámetros date y serviceId o serviceIds son requeridos' },
        { status: 400 }
      )
    }

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Usar YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Obtener los IDs de los servicios a calcular
    const serviceIds: string[] = []
    if (serviceIdsParam) {
      serviceIds.push(...serviceIdsParam.split(','))
    } else if (serviceId) {
      serviceIds.push(serviceId)
    }

    const supabase = createAdminClient()

    // Verificar si se permite reservar en el día actual
    const { data: sameDaySetting } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'allow_same_day_booking')
      .maybeSingle()

    const allowSameDay = sameDaySetting?.setting_value !== 'false'

    // 1. Obtener la duración acumulada de los servicios seleccionados
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, duration_minutes')
      .in('id', serviceIds)
      .eq('is_active', true)

    if (servicesError || !services || services.length === 0) {
      console.error('[API /availability/slots] Services error:', servicesError)
      return NextResponse.json(
        { error: 'Los servicios seleccionados no están disponibles o activos' },
        { status: 404 }
      )
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0)

    // 2. Obtener día de la semana para el horario laboral
    const dayOfWeek = new Date(date + 'T00:00:00').getDay() // 0 = Domingo, 1 = Lunes, etc.
    const { data: workingHours, error: whError } = await supabase
      .from('working_hours')
      .select('start_time, end_time, interval_minutes, is_working_day')
      .eq('day_of_week', dayOfWeek)
      .single()

    if (whError || !workingHours) {
      console.error('[API /availability/slots] Working hours error:', whError)
      return NextResponse.json(
        { error: 'Error al obtener configuración de horario laboral' },
        { status: 500 }
      )
    }

    // Si no es día laborable, retornar lista vacía
    if (!workingHours.is_working_day) {
      return NextResponse.json([])
    }

    // 3. Verificar si la fecha está bloqueada
    const { data: blockedDate, error: blockedError } = await supabase
      .from('blocked_dates')
      .select('id')
      .lte('blocked_date', date)
      .or(`end_date.gte.${date},end_date.is.null`)
      .maybeSingle()

    if (blockedError) {
      console.error('[API /availability/slots] Blocked date error:', blockedError)
      return NextResponse.json(
        { error: 'Error al verificar bloqueos de fecha' },
        { status: 500 }
      )
    }

    if (blockedDate) {
      return NextResponse.json([]) // Fecha bloqueada, sin horarios
    }

    // 4. Obtener todos los turnos activos para la fecha dada
    const { data: appointments, error: apptsError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed'])

    if (apptsError) {
      console.error('[API /availability/slots] Appointments error:', apptsError)
      return NextResponse.json(
        { error: 'Error al verificar turnos existentes' },
        { status: 500 }
      )
    }

    // --- 5. Lógica de cálculo en minutos para los slots ---
    function timeToMinutes(timeStr: string): number {
      const [h, m] = timeStr.split(':').map(Number)
      return h * 60 + m
    }

    function minutesToTime(minutes: number): string {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`
    }

    const startMinutes = timeToMinutes(workingHours.start_time)
    const endMinutes = timeToMinutes(workingHours.end_time)
    const interval = workingHours.interval_minutes

    const slots: { start: string; end: string; available: boolean }[] = []

    // Convertir horarios de turnos existentes a minutos
    const apptIntervals = (appointments || []).map((appt) => ({
      start: timeToMinutes(appt.start_time),
      end: timeToMinutes(appt.end_time),
    }))

    // Obtener la hora actual de Argentina para deshabilitar horarios pasados hoy
    const argentinaToday = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    
    if (date === argentinaToday && !allowSameDay) {
      return NextResponse.json([]) // Mismo día deshabilitado
    }

    let currentMinutes = 0
    if (date === argentinaToday) {
      const argentinaTime = new Date().toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
      })
      currentMinutes = timeToMinutes(argentinaTime)
    }

    // Generar slots incrementando por el intervalo definido
    for (let curr = startMinutes; curr + totalDuration <= endMinutes; curr += interval) {
      const slotStart = curr
      const slotEnd = curr + totalDuration

      // Verificar solapamiento con turnos activos
      const overlaps = apptIntervals.some(
        (appt) => slotStart < appt.end && slotEnd > appt.start
      )

      // Verificar si el horario ya pasó en el día de hoy
      const isPast = date === argentinaToday && slotStart < currentMinutes

      slots.push({
        start: minutesToTime(slotStart),
        end: minutesToTime(slotEnd),
        available: !overlaps && !isPast,
      })
    }

    return NextResponse.json(slots, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=5',
      },
    })
  } catch (err) {
    console.error('[API /availability/slots] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
