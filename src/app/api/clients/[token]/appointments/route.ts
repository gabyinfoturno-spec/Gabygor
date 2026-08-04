import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token es requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Find client by token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('access_token', token)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado o token inválido' },
        { status: 404 }
      )
    }

    // 2. Fetch appointments
    const { data: appointments, error: appError } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', client.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (appError) {
      console.error('[API Client Appointments] Error:', appError)
      return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 })
    }

    // 3. Fetch all services to resolve details
    const { data: allServices, error: sErr } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')

    if (sErr) {
      console.error('[API Client Appointments] Error fetching services:', sErr)
      return NextResponse.json({ error: 'Error al cargar servicios' }, { status: 500 })
    }

    const servicesMap = new Map(allServices?.map((s) => [s.id, s]) || [])

    // 4. Map appointments to include combined service details
    const mappedAppointments = (appointments || []).map((appt) => {
      const primaryService = servicesMap.get(appt.service_id)
      let combinedName = primaryService?.name || 'Servicio'
      let combinedPrice = Number(primaryService?.price || 0)
      let combinedDuration = Number(primaryService?.duration_minutes || 0)

      if (appt.additional_services && appt.additional_services.length > 0) {
        appt.additional_services.forEach((id: string) => {
          const addSvc = servicesMap.get(id)
          if (addSvc) {
            combinedName += ' + ' + addSvc.name
            combinedPrice += Number(addSvc.price)
            combinedDuration += Number(addSvc.duration_minutes)
          }
        })
      }

      return {
        ...appt,
        service: {
          id: appt.service_id,
          name: combinedName,
          price: combinedPrice,
          duration_minutes: combinedDuration,
        },
      }
    })

    return NextResponse.json(mappedAppointments)
  } catch (err) {
    console.error('[API Client Appointments] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
