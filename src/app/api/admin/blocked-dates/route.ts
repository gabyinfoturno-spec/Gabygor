import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/blocked-dates
 * Fetches all blocked dates.
 * Admin authenticated only.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: blockedDates, error } = await supabaseAdmin
      .from('blocked_dates')
      .select('*')
      .order('blocked_date', { ascending: true })

    if (error) {
      console.error('[API Blocked Dates GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener bloqueos' }, { status: 500 })
    }

    return NextResponse.json(blockedDates ?? [])
  } catch (err) {
    console.error('[API Blocked Dates GET] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/blocked-dates
 * Adds a new blocked date.
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
    const { blocked_date, end_date, reason, block_type } = body

    if (!blocked_date || !block_type) {
      return NextResponse.json(
        { error: 'Fecha de inicio y tipo de bloqueo son requeridos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 3. Insert blocked date
    const { data: newBlock, error: insertError } = await supabaseAdmin
      .from('blocked_dates')
      .insert({
        blocked_date,
        end_date: end_date || null,
        reason: reason?.trim() || null,
        block_type,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API Blocked Dates POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Error al crear bloqueo' }, { status: 500 })
    }

    return NextResponse.json(newBlock, { status: 201 })
  } catch (err) {
    console.error('[API Blocked Dates POST] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
