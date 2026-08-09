import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { mpPaymentAdminNotificationHtml, mpPaymentReceiptHtml } from '@/emails/templates'
import { formatDate, formatTime, formatPrice, getClientPortalUrl } from '@/lib/utils'

/**
 * Helper para procesar y verificar un pago de MP por su paymentId.
 */
export async function verifyAndProcessMpPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return { success: false, error: 'MP_ACCESS_TOKEN no configurado' }
  }

  // 1. Consultar estado real del pago en la API de Mercado Pago
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!paymentRes.ok) {
    return { success: false, error: 'No se pudo obtener el pago de Mercado Pago' }
  }

  const payment = await paymentRes.json()
  const appointmentId = payment.external_reference || payment.metadata?.appointment_id

  if (!appointmentId) {
    return { success: false, error: 'Sin referencia de turno en el pago' }
  }

  const supabase = createAdminClient()

  // 2. Obtener datos del turno
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
    return { success: false, error: 'Turno no encontrado' }
  }

  const client = (Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients) as { id: string; full_name: string; email: string; access_token: string } | null
  const service = (Array.isArray(appointment.services) ? appointment.services[0] : appointment.services) as { name: string; price: number } | null

  if (payment.status === 'approved') {
    if (appointment.payment_status !== 'paid') {
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

      // Actualizar DB a 'paid'
      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          mp_payment_id: String(payment.id),
          paid_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)

      // Enviar emails de confirmación
      const formattedDate = formatDate(appointment.appointment_date)
      const formattedTime = formatTime(appointment.start_time)
      const formattedAmount = formatPrice(totalPrice)
      const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'

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
      }).catch((err) => console.error('[MP Confirm] Error email admin:', err))

      if (client?.email) {
        const accessUrl = getClientPortalUrl(client.access_token)
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
        }).catch((err) => console.error('[MP Confirm] Error email cliente:', err))
      }

      console.log('[MP Confirm] Turno actualizado a paid:', appointmentId)
    }

    return { success: true, paymentStatus: 'paid', appointmentId }
  }

  return { success: true, paymentStatus: payment.status, appointmentId }
}
