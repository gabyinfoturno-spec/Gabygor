import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { confirmationEmailHtml, barberNotificationHtml } from '@/emails/templates'
import { formatDate, formatTime, generateAccessUrl } from '@/lib/utils'

// ============================================================
// POST /api/appointments — Crear un nuevo turno
// ============================================================

interface CreateAppointmentBody {
  serviceId: string
  additionalServices?: string[]
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM o HH:MM:SS
  endTime: string   // HH:MM o HH:MM:SS
  clientName: string
  clientEmail: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAppointmentBody = await request.json()
    const { serviceId, additionalServices, date, startTime, endTime, clientName, clientEmail } = body

    // --- Validaciones básicas ---
    if (!serviceId || !date || !startTime || !endTime || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (clientName.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return NextResponse.json(
        { error: 'El email no tiene un formato válido' },
        { status: 400 }
      )
    }

    // Usar admin client (service role) para bypass de RLS
    const supabase = createAdminClient()

    // --- 1. Verificar que el servicio existe y está activo ---
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'El servicio seleccionado no está disponible' },
        { status: 404 }
      )
    }

    // --- 2. Upsert del cliente (insertar o actualizar por email) ---
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, access_token')
      .eq('email', clientEmail.toLowerCase().trim())
      .single()

    let clientId: string
    let accessToken: string

    if (existingClient) {
      // Cliente existe: actualizar nombre si cambió
      clientId = existingClient.id
      accessToken = existingClient.access_token

      await supabase
        .from('clients')
        .update({ full_name: clientName.trim() })
        .eq('id', clientId)
    } else {
      // Cliente nuevo: insertar
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: clientName.trim(),
          email: clientEmail.toLowerCase().trim(),
        })
        .select('id, access_token')
        .single()

      if (clientError || !newClient) {
        console.error('[API /appointments] Error al crear cliente:', clientError)
        return NextResponse.json(
          { error: 'Error al registrar el cliente' },
          { status: 500 }
        )
      }

      clientId = newClient.id
      accessToken = newClient.access_token
    }

    // --- 2.5 Mitigación de Spam: Limitar a máximo 2 turnos futuros activos ---
    const { data: activeAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', clientId)
      .in('status', ['pending', 'confirmed'])

    if (activeAppointments && activeAppointments.length >= 2) {
      return NextResponse.json(
        { error: 'Límite de turnos alcanzado. Ya tenés 2 turnos pendientes o confirmados.' },
        { status: 400 }
      )
    }

    // --- 3. Insertar turno ---
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: clientId,
        service_id: serviceId,
        additional_services: additionalServices || [],
        appointment_date: date,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
      })
      .select('id, appointment_date, start_time, end_time, status, created_at, additional_services')
      .single()

    if (appointmentError) {
      console.error('[API /appointments] Error al crear turno:', appointmentError)

      // Manejar conflicto de horario (trigger check_appointment_availability)
      if (
        appointmentError.code === '23505' ||
        appointmentError.message?.includes('ya está ocupado')
      ) {
        return NextResponse.json(
          { error: 'El horario seleccionado ya no está disponible. Por favor, elegí otro horario.' },
          { status: 409 }
        )
      }

      // Manejar fecha bloqueada
      if (appointmentError.message?.includes('bloqueada')) {
        return NextResponse.json(
          { error: 'La fecha seleccionada no está disponible.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Error al crear el turno' },
        { status: 500 }
      )
    }

    // --- 4. Preparar detalles de los servicios para el email ---
    let servicesName = service.name
    let totalPrice = Number(service.price)

    if (additionalServices && additionalServices.length > 0) {
      const { data: additional } = await supabase
        .from('services')
        .select('name, price')
        .in('id', additionalServices)

      if (additional && additional.length > 0) {
        servicesName += ' + ' + additional.map((s) => s.name).join(' + ')
        totalPrice += additional.reduce((sum, s) => sum + Number(s.price), 0)
      }
    }

    // --- 5. Enviar email de confirmación al cliente (RF-13) ---
    const accessUrl = generateAccessUrl(accessToken)
    const formattedDate = formatDate(date)
    const formattedTime = formatTime(startTime)

    const emailPromises: Promise<unknown>[] = []

    // Enviar email al cliente
    emailPromises.push(
      sendEmail({
        to: clientEmail.toLowerCase().trim(),
        subject: `Turno confirmado — ${servicesName} el ${formattedDate}`,
        html: confirmationEmailHtml({
          clientName: clientName.trim(),
          serviceName: servicesName,
          date: formattedDate,
          time: formattedTime,
          accessUrl,
        }),
      }).catch((emailErr) => {
        console.error('[API /appointments] Error al enviar email al cliente:', emailErr)
        return null
      })
    )

    // Enviar notificación al barbero
    const barberEmail = process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com'
    if (barberEmail) {
      emailPromises.push(
        sendEmail({
          to: barberEmail,
          subject: `Nuevo turno: ${clientName.trim()} — ${servicesName}`,
          html: barberNotificationHtml({
            clientName: clientName.trim(),
            serviceName: servicesName,
            date: formattedDate,
            time: formattedTime,
          }),
        }).catch((emailErr) => {
          console.error('[API /appointments] Error al enviar email al barbero:', emailErr)
          return null
        })
      )
    }

    // Await both emails in parallel
    await Promise.all(emailPromises)

    // --- 6. Registrar logs de email ---
    try {
      await supabase.from('email_logs').insert([
        {
          recipient: clientEmail.toLowerCase().trim(),
          subject: `Turno confirmado — ${service.name}`,
          email_type: 'confirmation',
          reference_id: appointment.id,
          status: 'sent',
        },
        ...(barberEmail
          ? [
              {
                recipient: barberEmail,
                subject: `Nuevo turno: ${clientName.trim()}`,
                email_type: 'barber_notification',
                reference_id: appointment.id,
                status: 'sent',
              },
            ]
          : []),
      ])
    } catch {
      // Log silencioso — no crítico
      console.error('[API /appointments] Error al registrar email logs')
    }

    // --- Respuesta exitosa ---
    return NextResponse.json(
      {
        appointment: {
          ...appointment,
          service: {
            name: servicesName,
            price: totalPrice,
          },
        },
        client: {
          id: clientId,
          accessToken,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[API /appointments] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET /api/appointments — Listar turnos (admin)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Parámetros de filtro
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const clientId = searchParams.get('clientId')

    // Construir query
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        additional_services,
        clients (id, full_name, email, phone),
        services (id, name, price, duration_minutes)
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (date) {
      query = query.eq('appointment_date', date)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('[API /appointments GET] Error:', error)
      return NextResponse.json(
        { error: 'Error al obtener los turnos' },
        { status: 500 }
      )
    }

    // Fetch all services to resolve details of additional services
    const { data: allServices } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
    const servicesMap = new Map(allServices?.map((s) => [s.id, s]) || [])

    interface AppointmentRow {
      additional_services: string[] | null
      services: { id: string; name: string; price: number; duration_minutes: number } | null
      [key: string]: unknown
    }

    // Map appointments to resolve combined service details
    const mappedAppointments = (appointments || []).map((appt: unknown) => {
      const row = appt as AppointmentRow
      const serviceObj = row.services
      if (!serviceObj) return row

      let combinedName = serviceObj.name
      let combinedPrice = Number(serviceObj.price)
      let combinedDuration = Number(serviceObj.duration_minutes)

      if (row.additional_services && row.additional_services.length > 0) {
        row.additional_services.forEach((id: string) => {
          const addSvc = servicesMap.get(id)
          if (addSvc) {
            combinedName += ' + ' + addSvc.name
            combinedPrice += Number(addSvc.price)
            combinedDuration += Number(addSvc.duration_minutes)
          }
        })
      }

      return {
        ...row,
        services: {
          ...serviceObj,
          name: combinedName,
          price: combinedPrice,
          duration_minutes: combinedDuration,
        },
      }
    })

    return NextResponse.json(mappedAppointments)
  } catch (err) {
    console.error('[API /appointments GET] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
