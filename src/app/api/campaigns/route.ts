import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { campaignHtml } from '@/emails/templates'

/**
 * GET /api/campaigns
 * Lists sent campaigns.
 * Admin authenticated only.
 */
export async function GET() {
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

    const supabaseAdmin = createAdminClient()

    // 2. Fetch email campaigns
    const { data: campaigns, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API Campaigns GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener campañas' }, { status: 500 })
    }

    return NextResponse.json(campaigns ?? [])
  } catch (err) {
    console.error('[API Campaigns GET] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/campaigns
 * Creates and sends a new campaign.
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
    const { subject, content, segment_type, segment_value } = body

    if (!subject || !content || !segment_type) {
      return NextResponse.json(
        { error: 'Asunto, contenido y segmento son requeridos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 3. Get clients in selected segment
    const monthsParam = segment_value ? parseInt(segment_value, 10) : null
    const { data: clients, error: rpcError } = await supabaseAdmin.rpc(
      'get_clients_by_segment',
      {
        p_segment_type: segment_type,
        p_months: monthsParam,
      }
    )

    if (rpcError || !clients) {
      console.error('[API Campaigns POST] RPC error:', rpcError)
      return NextResponse.json({ error: 'Error al obtener clientes del segmento' }, { status: 500 })
    }

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'No hay clientes en el segmento seleccionado para enviar' },
        { status: 400 }
      )
    }

    // 4. Create campaign record (as draft/sending)
    const { data: campaign, error: insertError } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        subject,
        content,
        segment_type,
        segment_value: monthsParam,
        recipients_count: clients.length,
        status: 'sending',
      })
      .select()
      .single()

    if (insertError || !campaign) {
      console.error('[API Campaigns POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Error al iniciar campaña' }, { status: 500 })
    }

    // 5. Send emails asynchronously or in a loop
    let sentCount = 0
    let failedCount = 0

    const emailHtmlContent = campaignHtml({ content })

    for (const client of clients) {
      try {
        const emailId = await sendEmail({
          to: client.email,
          subject,
          html: emailHtmlContent,
        })

        if (emailId) {
          sentCount++
          // Log email send success
          await supabaseAdmin.from('email_logs').insert({
            recipient: client.email,
            subject,
            email_type: 'campaign',
            reference_id: campaign.id,
            status: 'sent',
          })
        } else {
          failedCount++
          await supabaseAdmin.from('email_logs').insert({
            recipient: client.email,
            subject,
            email_type: 'campaign',
            reference_id: campaign.id,
            status: 'failed',
            error_message: 'Resend rejected the request',
          })
        }
      } catch (err) {
        failedCount++
        console.error(`Error sending email to ${client.email}:`, err)
        await supabaseAdmin.from('email_logs').insert({
          recipient: client.email,
          subject,
          email_type: 'campaign',
          reference_id: campaign.id,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // 6. Update campaign record on finish
    const finalStatus = failedCount === clients.length ? 'failed' : 'sent'
    await supabaseAdmin
      .from('email_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)

    return NextResponse.json({
      success: true,
      message: `Campaña enviada a ${sentCount} clientes (${failedCount} fallidos).`,
      campaignId: campaign.id,
    })
  } catch (err) {
    console.error('[API Campaigns POST] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
