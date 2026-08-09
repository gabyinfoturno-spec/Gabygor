import { NextRequest, NextResponse } from 'next/server'
import { verifyAndProcessMpPayment } from '@/lib/mp-verify'

export const dynamic = 'force-dynamic'

async function handleWebhook(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let resourceId = searchParams.get('id') || searchParams.get('data.id')

    // Intentar leer JSON del body si existe
    try {
      const body = await request.json()
      console.log('[MP Webhook] Body:', JSON.stringify(body))
      if (!resourceId) {
        resourceId = body.data?.id || body.id
      }
    } catch {
      // Body vacío o no-JSON (típico en notificaciones IPN por GET/URL)
    }

    if (!resourceId) {
      console.log('[MP Webhook] No resource ID found in request')
      return NextResponse.json({ received: true })
    }

    console.log('[MP Webhook] Processing payment ID:', resourceId)
    await verifyAndProcessMpPayment(String(resourceId))

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[MP Webhook] Error:', err)
    return NextResponse.json({ received: true })
  }
}

export async function POST(request: NextRequest) {
  return handleWebhook(request)
}

export async function GET(request: NextRequest) {
  return handleWebhook(request)
}
