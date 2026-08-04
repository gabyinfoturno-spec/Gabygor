import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/services
 * Returns active services sorted by display_order.
 * Public endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    // Usamos el cliente de admin para evitar la llamada lenta a cookies() en un endpoint público
    const supabase = createAdminClient()

    let query = supabase
      .from('services')
      .select('id, name, description, price, duration_minutes, is_active, display_order, compatible_services')

    if (!all) {
      query = query.eq('is_active', true)
    }

    const { data: services, error } = await query.order('display_order', { ascending: true })

    if (error) {
      console.error('[API /services GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener los servicios' }, { status: 500 })
    }

    return NextResponse.json(services ?? [], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    })
  } catch (err) {
    console.error('[API /services GET] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/services
 * Creates a new service.
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
    const { name, description, price, duration_minutes, is_active, compatible_services } = body

    if (!name || price === undefined || !duration_minutes) {
      return NextResponse.json(
        { error: 'Los campos nombre, precio y duración son requeridos' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Get the highest display order to place this service at the end
    const { data: maxOrderData } = await supabaseAdmin
      .from('services')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = maxOrderData && maxOrderData[0] ? maxOrderData[0].display_order + 1 : 1

    // Insert service
    const { data: newService, error: insertError } = await supabaseAdmin
      .from('services')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        price,
        duration_minutes,
        is_active: is_active ?? true,
        display_order: nextOrder,
        compatible_services: compatible_services || [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API /services POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Error al crear el servicio' }, { status: 500 })
    }

    return NextResponse.json(newService, { status: 201 })
  } catch (err) {
    console.error('[API /services POST] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
