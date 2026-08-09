import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { mpPaymentAdminNotificationHtml, mpPaymentReceiptHtml } from '@/emails/templates'
import { formatDate, formatTime, formatPrice, getClientPortalUrl } from '@/lib/utils'

/**
 * POST /api/payments/webhook
 * Recibe notificaciones de Mercado Pago (IPN / Webhooks).
 * MP llama a este endpoint cuando el estado de un pago cambia.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[MP Webhook] Received:', JSON.stringify(body))

    // MP envía diferentes tipos de notificaciones
    const topic = body.topic || body.type
    const resourceId = body.data?.id || body.id

    // Solo procesamos eventos de pago
    if (topic !== 'payment' && topic !== 'merchant_order') {
      return NextResponse.json({ received: true })
    }

    if (!resourceId) {
      return NextResponse.json({ received: true })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[MP Webhook] MP_ACCESS_TOKEN not configured')
      return NextResponse.json({ error: 'MP not configured' }, { status: 500 })
    }

    // 1. Obtener los detalles del pago desde la API de MP
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!paymentRes.ok) {
      console.error('[MP Webhook] Error fetching payment:', resourceId)
      return NextResponse.json({ received: true })
    }

    const payment = await paymentRes.json()
    console.log('[MP Webhook] Payment status:', payment.status, 'for', payment.external_reference)

    const appointmentId = payment.external_reference || payment.metadata?.appointment_id
    if (!appointmentId) {
      console.error('[MP Webhook] No appointment_id in payment metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    // 2. Obtener el turno con datos del cliente
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        payment_status,
        additional_services,
        clients (id, full_name, email, access_token),
        services (name, price)
      `)
      .eq('id', appointmentId)
      .single()

    if (apptError || !appointment) {
      console.error('[MP Webhook] Appointment not found:', appointmentId)
      return NextResponse.json({ received: true })
    }

    const client = (Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients) as { id: string; full_name: string; email: string; access_token: string } | null
    const service = (Array.isArray(appointment.services) ? appointment.services[0] : appointment.services) as { name: string; price: number } | null

    // 3. Actualizar según el estado del pago
    if (payment.status === 'approved') {
      // Evitar procesar el mismo pago dos veces
      if (appointment.payment_status === 'paid') {
        return NextResponse.json({ received: true })
      }

      // Calcular precio total
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

      // Actualizar turno: payment_status = 'paid'
      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          mp_payment_id: String(payment.id),
          paid_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)

      const formattedDate = formatDate(appointment.appointment_date)
      const formattedTime = formatTime(appointment.start_time)
      const formattedAmount = formatPrice(totalPrice)

      // 4. Enviar emails en paralelo
      const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'
      const emailPromises: Promise<unknown>[] = []

      // Email al admin
      emailPromises.push(
        sendEmail({
          to: barberEmail,
          subject: `Pago recibido: ${client?.full_name || 'Cliente'} — ${serviceName}`,
          html: mpPaymentAdminNotificationHtml({
            clientName: client?.full_name || 'Cliente',
            clientEmail: client?.email || '',
            serviceName,
            date: formattedDate,
            time: formattedTime,
            amount: formattedAmount,
            mpPaymentId: String(payment.id),
          }),
        }).catch((err) => console.error('[MP Webhook] Error sending admin email:', err))
      )

      // Email al cliente
      if (client?.email) {
        const accessUrl = getClientPortalUrl(client.access_token)
        emailPromises.push(
          sendEmail({
            to: client.email,
            subject: `✅ Pago confirmado — ${serviceName}`,
            html: mpPaymentReceiptHtml({
              clientName: client.full_name,
              serviceName,
              date: formattedDate,
              time: formattedTime,
              amount: formattedAmount,
              accessUrl,
            }),
          }).catch((err) => console.error('[MP Webhook] Error sending client email:', err))
        )
      }

      await Promise.all(emailPromises)

      // Log en email_logs
      try {
        await supabase.from('email_logs').insert([
          {
            recipient: barberEmail,
            subject: `Pago MP recibido: ${client?.full_name}`,
            email_type: 'mp_payment_admin',
            reference_id: appointmentId,
            status: 'sent',
          },
          ...(client?.email ? [{
            recipient: client.email,
            subject: `Pago confirmado — ${serviceName}`,
            email_type: 'mp_payment_receipt',
            reference_id: appointmentId,
            status: 'sent',
          }] : []),
        ])
      } catch {
        // Log silencioso
      }

      console.log('[MP Webhook] Payment approved processed for appointment:', appointmentId)

    } else if (payment.status === 'pending') {
      await supabase
        .from('appointments')
        .update({ mp_payment_id: String(payment.id) })
        .eq('id', appointmentId)

    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      // Solo reseteamos si estaba pendiente (no si ya fue pagado)
      if (appointment.payment_status === 'pending') {
        await supabase
          .from('appointments')
          .update({ payment_status: 'pending', mp_payment_id: String(payment.id) })
          .eq('id', appointmentId)
      }
    }

    // Siempre respondemos 200 a MP para que no reintente
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[MP Webhook] Error inesperado:', err)
    // Aún así devolvemos 200 para evitar reintentos de MP
    return NextResponse.json({ received: true })
  }
}
