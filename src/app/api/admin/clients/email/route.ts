import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { individualEmailHtml } from '@/emails/templates'

/**
 * POST /api/admin/clients/email
 * Sends a custom individual email to a specific client.
 * Admin authenticated only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Check admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Parse body
    const body = await request.json()
    const { clientId, subject, content } = body

    if (!clientId || !subject || !content) {
      return NextResponse.json(
        { error: 'El cliente, asunto y mensaje son requeridos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 3. Fetch client details
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, full_name, email')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('[API Client Email POST] Client error:', clientError)
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // 4. Generate email content and send
    const emailHtmlContent = individualEmailHtml({
      clientName: client.full_name,
      content: content,
    })

    const emailId = await sendEmail({
      to: client.email,
      subject,
      html: emailHtmlContent,
    })

    if (!emailId) {
      throw new Error('El servicio de email falló al enviar')
    }

    // 5. Log the email
    await supabaseAdmin.from('email_logs').insert({
      recipient: client.email,
      subject,
      email_type: 'individual',
      reference_id: client.id,
      status: 'sent',
    })

    return NextResponse.json({ success: true, message: 'Correo electrónico enviado exitosamente.' })
  } catch (err) {
    console.error('[API Client Email POST] Error inesperado:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
