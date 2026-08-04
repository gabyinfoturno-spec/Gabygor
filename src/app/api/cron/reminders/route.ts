import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { reminderClientHtml, reminderBarberHtml } from '@/emails/templates'
import { formatDate, formatTime, generateAccessUrl } from '@/lib/utils'

/**
 * GET /api/cron/reminders
 * Triggered by Vercel Cron or manual request to send appointment reminders 24h prior.
 * Protected by CRON_SECRET token.
 */
export async function GET(request: NextRequest) {
  return handleReminders(request)
}

export async function POST(request: NextRequest) {
  return handleReminders(request)
}

async function handleReminders(request: NextRequest) {
  try {
    // 1. Verify cron authorization
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron Reminders] Unauthorized request attempt')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'

    if (!barberEmail) {
      console.error('[Cron Reminders] BARBER_EMAIL env variable is not set')
      return NextResponse.json({ error: 'BARBER_EMAIL no configurado' }, { status: 500 })
    }

    // 2. Fetch appointments needing reminder
    // (Calls SQL RPC function `get_appointments_needing_reminder(p_hours_before)`)
    const { searchParams } = new URL(request.url)
    const hoursParam = searchParams.get('hours')
    const hoursBefore = hoursParam ? parseInt(hoursParam, 10) : 36

    const { data: appointments, error: rpcError } = await supabaseAdmin.rpc(
      'get_appointments_needing_reminder',
      { p_hours_before: hoursBefore }
    )

    if (rpcError) {
      console.error('[Cron Reminders] RPC error:', rpcError)
      return NextResponse.json({ error: 'Error al buscar turnos para recordatorio' }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay turnos que requieran recordatorio en este momento.',
        processed_count: 0,
      })
    }

    const results = []

    // 3. Process each appointment
    for (const app of appointments) {
      const appResults = {
        appointment_id: app.appointment_id,
        client_reminded: false,
        barber_reminded: false,
        errors: [] as string[],
      }

      const formattedDate = formatDate(app.appointment_date)
      const formattedTime = formatTime(app.start_time)

      // A. Send reminder to client
      if (!app.reminder_client_sent) {
        try {
          // Fetch client's access token for portal URL
          const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('access_token')
            .eq('email', app.client_email)
            .single()

          if (clientError || !client) {
            throw new Error(`No se encontró el token de acceso para ${app.client_email}`)
          }

          const accessUrl = generateAccessUrl(client.access_token)

          const emailId = await sendEmail({
            to: app.client_email,
            subject: `Recordatorio de tu turno mañana — ${formattedTime}`,
            html: reminderClientHtml({
              clientName: app.client_name,
              serviceName: app.service_name,
              date: formattedDate,
              time: formattedTime,
              accessUrl,
            }),
          })

          if (emailId) {
            appResults.client_reminded = true
            
            // Log email log
            await supabaseAdmin.from('email_logs').insert({
              recipient: app.client_email,
              subject: `Recordatorio de tu turno mañana — ${formattedTime}`,
              email_type: 'reminder',
              reference_id: app.appointment_id,
              status: 'sent',
            })

            // Update appointment state
            await supabaseAdmin
              .from('appointments')
              .update({ reminder_client_sent: true })
              .eq('id', app.appointment_id)
          } else {
            throw new Error('Resend rejected client email request')
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Error desconocido al enviar al cliente'
          console.error(`[Cron Reminders] Error client appointment ${app.appointment_id}:`, errMsg)
          appResults.errors.push(errMsg)

          await supabaseAdmin.from('email_logs').insert({
            recipient: app.client_email,
            subject: `Recordatorio de tu turno mañana — ${formattedTime}`,
            email_type: 'reminder',
            reference_id: app.appointment_id,
            status: 'failed',
            error_message: errMsg,
          })
        }
      }

      // B. Send reminder to barber
      if (!app.reminder_barber_sent) {
        try {
          const emailId = await sendEmail({
            to: barberEmail,
            subject: `Recordatorio: Turno mañana con ${app.client_name} — ${formattedTime}`,
            html: reminderBarberHtml({
              clientName: app.client_name,
              serviceName: app.service_name,
              date: formattedDate,
              time: formattedTime,
            }),
          })

          if (emailId) {
            appResults.barber_reminded = true

            // Log email log
            await supabaseAdmin.from('email_logs').insert({
              recipient: barberEmail,
              subject: `Recordatorio: Turno mañana con ${app.client_name} — ${formattedTime}`,
              email_type: 'barber_notification',
              reference_id: app.appointment_id,
              status: 'sent',
            })

            // Update appointment state
            await supabaseAdmin
              .from('appointments')
              .update({ reminder_barber_sent: true })
              .eq('id', app.appointment_id)
          } else {
            throw new Error('Resend rejected barber email request')
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Error desconocido al enviar al barbero'
          console.error(`[Cron Reminders] Error barber appointment ${app.appointment_id}:`, errMsg)
          appResults.errors.push(errMsg)

          await supabaseAdmin.from('email_logs').insert({
            recipient: barberEmail,
            subject: `Recordatorio: Turno mañana con ${app.client_name} — ${formattedTime}`,
            email_type: 'barber_notification',
            reference_id: app.appointment_id,
            status: 'failed',
            error_message: errMsg,
          })
        }
      }

      results.push(appResults)
    }

    return NextResponse.json({
      success: true,
      message: `Proceso de recordatorios completado.`,
      processed_count: appointments.length,
      results,
    })
  } catch (err) {
    console.error('[Cron Reminders] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
