import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { mpRefundClientHtml } from '@/emails/templates'
import { formatDate, formatPrice } from '@/lib/utils'

/**
 * POST /api/payments/refund
 * Procesa la devolución de un pago de MP para un turno cancelado.
 * Solo accesible por admin autenticado.
 * Body: { appointmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación admin
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { appointmentId } = await request.json()
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId requerido' }, { status: 400 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 500 })
    }

    const supabase = createAdminClient()

    // 2. Obtener el turno con mp_payment_id
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        payment_status,
        mp_payment_id,
        additional_services,
        clients (full_name, email),
        services (name, price)
      `)
      .eq('id', appointmentId)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    if (appointment.payment_status !== 'paid') {
      return NextResponse.json({ error: 'El turno no tiene un pago confirmado para devolver' }, { status: 400 })
    }

    if (!appointment.mp_payment_id) {
      return NextResponse.json({ error: 'No se encontró el ID de pago de Mercado Pago' }, { status: 400 })
    }

    const client = (Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients) as { full_name: string; email: string } | null
    const service = (Array.isArray(appointment.services) ? appointment.services[0] : appointment.services) as { name: string; price: number } | null

    // 3. Llamar a la API de MP para hacer la devolución total
    const refundRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${appointment.mp_payment_id}/refunds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}), // body vacío = devolución total
      }
    )

    if (!refundRes.ok) {
      const refundError = await refundRes.json()
      console.error('[MP Refund] Error:', refundError)
      return NextResponse.json(
        { error: refundError.message || 'Error al procesar la devolución en Mercado Pago' },
        { status: 500 }
      )
    }

    // 4. Actualizar payment_status en la DB
    await supabase
      .from('appointments')
      .update({ payment_status: 'refunded' })
      .eq('id', appointmentId)

    // 5. Calcular precio total para el email
    let totalPrice = Number(service?.price || 0)
    let serviceName = service?.name || 'Servicio'

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

    // 6. Notificar al cliente por email
    if (client?.email) {
      await sendEmail({
        to: client.email,
        subject: `Reembolso procesado — ${serviceName}`,
        html: mpRefundClientHtml({
          clientName: client.full_name,
          serviceName,
          date: formatDate(appointment.appointment_date),
          amount: formatPrice(totalPrice),
        }),
      }).catch((err) => console.error('[MP Refund] Error sending email:', err))
    }

    return NextResponse.json({ success: true, message: 'Devolución procesada correctamente' })
  } catch (err) {
    console.error('[MP Refund] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
