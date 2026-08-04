import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import {
  rescheduleClientHtml,
  rescheduleBarberHtml,
  cancellationClientHtml,
  cancellationBarberHtml,
} from '@/emails/templates'
import { formatDate, formatTime, generateAccessUrl } from '@/lib/utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, newDate, newStartTime, newEndTime, token } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de turno es requerido' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Get current appointment details
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        service:services(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    // 2. Auth checks: Is this the admin or the token owner?
    const supabaseUser = await createClient()
    const {
      data: { user: adminUser },
    } = await supabaseUser.auth.getUser()

    const isAdmin = !!adminUser

    // If not admin, check client token
    if (!isAdmin) {
      if (!token || token !== appointment.client.access_token) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // 3. Handle Actions
    if (action === 'reschedule' || action === 'cancel') {
      // Check 2-hour modification rule
      // If it is admin, bypass the 2-hour rule (admin can always reschedule/cancel)
      if (!isAdmin) {
        const { data: canModify, error: rpcError } = await supabaseAdmin.rpc(
          'can_modify_appointment',
          { p_appointment_id: id }
        )

        if (rpcError) {
          console.error('[API Appointment PATCH] RPC error:', rpcError)
        }

        if (!canModify) {
          return NextResponse.json(
            { error: 'Este turno ya no puede modificarse (límite de 2 horas antes)' },
            { status: 400 }
          )
        }
      }

      if (action === 'cancel') {
        // Set status to cancelled
        const { error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', id)

        if (updateError) {
          return NextResponse.json({ error: 'Error al cancelar turno' }, { status: 500 })
        }

        const formattedDate = formatDate(appointment.appointment_date)
        const formattedTime = formatTime(appointment.start_time)

        // Send email to client
        let clientEmailId: string | null = null
        try {
          clientEmailId = await sendEmail({
            to: appointment.client.email,
            subject: `Turno cancelado — ${appointment.service.name}`,
            html: cancellationClientHtml({
              clientName: appointment.client.full_name,
              serviceName: appointment.service.name,
              date: formattedDate,
              time: formattedTime,
            }),
          })

          await supabaseAdmin.from('email_logs').insert({
            recipient: appointment.client.email,
            subject: `Turno cancelado — ${appointment.service.name}`,
            email_type: 'cancellation',
            reference_id: id,
            status: clientEmailId ? 'sent' : 'failed',
          })
        } catch (err) {
          console.error('[API PATCH cancel] Client email error:', err)
          await supabaseAdmin.from('email_logs').insert({
            recipient: appointment.client.email,
            subject: `Turno cancelado — ${appointment.service.name}`,
            email_type: 'cancellation',
            reference_id: id,
            status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
          })
        }

        // Send email to barber (only if cancelled by client)
        if (!isAdmin) {
          const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'
          if (barberEmail) {
            let barberEmailId: string | null = null
            try {
              barberEmailId = await sendEmail({
                to: barberEmail,
                subject: `Turno cancelado por cliente: ${appointment.client.full_name}`,
                html: cancellationBarberHtml({
                  clientName: appointment.client.full_name,
                  serviceName: appointment.service.name,
                  date: formattedDate,
                  time: formattedTime,
                }),
              })

              await supabaseAdmin.from('email_logs').insert({
                recipient: barberEmail,
                subject: `Turno cancelado por cliente: ${appointment.client.full_name}`,
                email_type: 'barber_notification',
                reference_id: id,
                status: barberEmailId ? 'sent' : 'failed',
              })
            } catch (err) {
              console.error('[API PATCH cancel] Barber email error:', err)
              await supabaseAdmin.from('email_logs').insert({
                recipient: barberEmail,
                subject: `Turno cancelado por cliente: ${appointment.client.full_name}`,
                email_type: 'barber_notification',
                reference_id: id,
                status: 'failed',
                error_message: err instanceof Error ? err.message : String(err),
              })
            }
          }
        }

        return NextResponse.json({ success: true, message: 'Turno cancelado' })
      }

      if (action === 'reschedule') {
        if (!newDate || !newStartTime || !newEndTime) {
          return NextResponse.json(
            { error: 'Fecha y hora nuevas son requeridas para reprogramar' },
            { status: 400 }
          )
        }

        // Update appointment details
        const { error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            appointment_date: newDate,
            start_time: newStartTime,
            end_time: newEndTime,
            status: 'pending', 
          })
          .eq('id', id)

        if (updateError) {
          console.error('[API PATCH reschedule] Error:', updateError)
          if (
            updateError.code === '23505' ||
            updateError.message?.includes('ya está ocupado')
          ) {
            return NextResponse.json(
              { error: 'El horario seleccionado ya está ocupado' },
              { status: 409 }
            )
          }
          return NextResponse.json({ error: 'Error al reprogramar turno' }, { status: 500 })
        }

        const accessUrl = generateAccessUrl(appointment.client.access_token)

        const oldFormattedDate = formatDate(appointment.appointment_date)
        const oldFormattedTime = formatTime(appointment.start_time)
        const newFormattedDate = formatDate(newDate)
        const newFormattedTime = formatTime(newStartTime)

        // Send email to client
        let clientEmailId: string | null = null
        try {
          clientEmailId = await sendEmail({
            to: appointment.client.email,
            subject: `Turno reprogramado — ${appointment.service.name}`,
            html: rescheduleClientHtml({
              clientName: appointment.client.full_name,
              serviceName: appointment.service.name,
              oldDate: oldFormattedDate,
              oldTime: oldFormattedTime,
              newDate: newFormattedDate,
              newTime: newFormattedTime,
              accessUrl,
            }),
          })

          await supabaseAdmin.from('email_logs').insert({
            recipient: appointment.client.email,
            subject: `Turno reprogramado — ${appointment.service.name}`,
            email_type: 'reschedule',
            reference_id: id,
            status: clientEmailId ? 'sent' : 'failed',
          })
        } catch (err) {
          console.error('[API PATCH reschedule] Client email error:', err)
          await supabaseAdmin.from('email_logs').insert({
            recipient: appointment.client.email,
            subject: `Turno reprogramado — ${appointment.service.name}`,
            email_type: 'reschedule',
            reference_id: id,
            status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
          })
        }

        // Send email to barber (only if rescheduled by client)
        if (!isAdmin) {
          const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'
          if (barberEmail) {
            let barberEmailId: string | null = null
            try {
              barberEmailId = await sendEmail({
                to: barberEmail,
                subject: `Turno reprogramado por cliente: ${appointment.client.full_name}`,
                html: rescheduleBarberHtml({
                  clientName: appointment.client.full_name,
                  serviceName: appointment.service.name,
                  oldDate: oldFormattedDate,
                  oldTime: oldFormattedTime,
                  newDate: newFormattedDate,
                  newTime: newFormattedTime,
                }),
              })

              await supabaseAdmin.from('email_logs').insert({
                recipient: barberEmail,
                subject: `Turno reprogramado por cliente: ${appointment.client.full_name}`,
                email_type: 'barber_notification',
                reference_id: id,
                status: barberEmailId ? 'sent' : 'failed',
              })
            } catch (err) {
              console.error('[API PATCH reschedule] Barber email error:', err)
              await supabaseAdmin.from('email_logs').insert({
                recipient: barberEmail,
                subject: `Turno reprogramado por cliente: ${appointment.client.full_name}`,
                email_type: 'barber_notification',
                reference_id: id,
                status: 'failed',
                error_message: err instanceof Error ? err.message : String(err),
              })
            }
          }
        }

        return NextResponse.json({ success: true, message: 'Turno reprogramado' })
      }
    }

    // Admin-only actions
    if (action === 'complete' || action === 'no_show') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }

      const statusMap = {
        complete: 'completed',
        no_show: 'no_show',
      }

      const status = statusMap[action as 'complete' | 'no_show']

      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ status })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Error al actualizar estado del turno' }, { status: 500 })
      }

      // Calcular ganancias del mes si se completó el turno
      let monthlyEarnings = 0
      if (action === 'complete') {
        try {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

          const { data: completedAppointments } = await supabaseAdmin
            .from('appointments')
            .select('service_id, additional_services, services(price)')
            .eq('status', 'completed')
            .gte('appointment_date', startOfMonthStr)

          const { data: allServices } = await supabaseAdmin
            .from('services')
            .select('id, price')
          const servicesMap = new Map(allServices?.map((s) => [s.id, Number(s.price)]) || [])

          completedAppointments?.forEach((appt) => {
            const mainPrice = appt.services ? Number((appt.services as unknown as { price: number }).price) : 0
            monthlyEarnings += mainPrice

            if (appt.additional_services && appt.additional_services.length > 0) {
              appt.additional_services.forEach((id: string) => {
                const addPrice = servicesMap.get(id) || 0
                monthlyEarnings += addPrice
              })
            }
          })
        } catch (calcError) {
          console.error('[API Appointment PATCH] Error calculating earnings:', calcError)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Turno actualizado a ${status}`,
        monthlyEarnings,
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (err) {
    console.error('[API Appointment PATCH] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
