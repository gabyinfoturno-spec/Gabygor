import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/payments/create-preference
 * Crea una preferencia de pago en Mercado Pago y devuelve el init_point.
 * Body: { appointmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 500 })
    }

    // 1. Obtener el turno con datos del cliente y servicio
    const supabase = createAdminClient()
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        additional_services,
        clients (full_name, email, access_token),
        services (name, price)
      `)
      .eq('id', appointmentId)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    const client = (Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients) as { full_name: string; email: string; access_token: string } | null
    const service = (Array.isArray(appointment.services) ? appointment.services[0] : appointment.services) as { name: string; price: number } | null

    if (!client || !service) {
      return NextResponse.json({ error: 'Datos incompletos del turno' }, { status: 400 })
    }

    // 2. Calcular precio total (servicio principal + adicionales)
    let totalPrice = Number(service.price)
    let serviceName = service.name

    if (appointment.additional_services && Array.isArray(appointment.additional_services) && appointment.additional_services.length > 0) {
      const { data: addSvcs } = await supabase
        .from('services')
        .select('name, price')
        .in('id', appointment.additional_services)

      if (addSvcs && addSvcs.length > 0) {
        totalPrice += addSvcs.reduce((sum, s) => sum + Number(s.price), 0)
        serviceName += ' + ' + addSvcs.map((s) => s.name).join(' + ')
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gabygor.com.ar'
    const accessUrl = `${appUrl}/mis-turnos/${client.access_token}`

    // 3. Crear preferencia en Mercado Pago
    const preferenceBody = {
      items: [
        {
          id: appointmentId,
          title: `Turno ${serviceName} — GabyGor`,
          description: `Turno reservado para el ${appointment.appointment_date} a las ${appointment.start_time}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: totalPrice,
        },
      ],
      payer: {
        name: client.full_name,
        email: client.email,
      },
      back_urls: {
        success: `${appUrl}/pago/resultado?status=approved&appointment_id=${appointmentId}`,
        failure: `${appUrl}/pago/resultado?status=failure&appointment_id=${appointmentId}`,
        pending: `${appUrl}/pago/resultado?status=pending&appointment_id=${appointmentId}`,
      },
      auto_return: 'approved',
      external_reference: appointmentId,
      notification_url: `${appUrl}/api/payments/webhook`,
      metadata: {
        appointment_id: appointmentId,
        client_email: client.email,
        client_name: client.full_name,
        access_url: accessUrl,
      },
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    })

    if (!mpResponse.ok) {
      const mpError = await mpResponse.json()
      console.error('[MP create-preference] Error:', mpError)
      return NextResponse.json({ error: 'Error al crear el pago en Mercado Pago' }, { status: 500 })
    }

    const mpData = await mpResponse.json()
    const preferenceId: string = mpData.id
    const initPoint: string = mpData.init_point

    // 4. Guardar el preference_id en el turno
    await supabase
      .from('appointments')
      .update({ mp_preference_id: preferenceId })
      .eq('id', appointmentId)

    return NextResponse.json({ initPoint, preferenceId })
  } catch (err) {
    console.error('[MP create-preference] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
