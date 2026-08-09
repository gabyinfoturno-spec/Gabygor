import { NextRequest, NextResponse } from 'next/server'
import { verifyAndProcessMpPayment } from '@/lib/mp-verify'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/confirm
 * Endpoint invocado por la página /pago/resultado para confirmar inmediatamente el pago.
 * Body: { paymentId: string, appointmentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })
    }

    const result = await verifyAndProcessMpPayment(paymentId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[API payments/confirm] Error:', err)
    return NextResponse.json({ error: 'Error al confirmar pago' }, { status: 500 })
  }
}
