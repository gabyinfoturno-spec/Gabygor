import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/services/[id]
 * Updates an existing service.
 * Admin authenticated only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID de servicio es requerido' }, { status: 400 })
    }

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
    const { name, description, price, duration_minutes, is_active, display_order, compatible_services } = body

    const supabaseAdmin = createAdminClient()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (price !== undefined) updateData.price = price
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
    if (is_active !== undefined) updateData.is_active = is_active
    if (display_order !== undefined) updateData.display_order = display_order
    if (compatible_services !== undefined) updateData.compatible_services = compatible_services

    updateData.updated_at = new Date().toISOString()

    const { data: updatedService, error: updateError } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[API /services/[id] PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Error al actualizar el servicio' }, { status: 500 })
    }

    return NextResponse.json(updatedService)
  } catch (err) {
    console.error('[API /services/[id] PATCH] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/services/[id]
 * Deletes an existing service.
 * Admin authenticated only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID de servicio es requerido' }, { status: 400 })
    }

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

    // Delete service
    const { error: deleteError } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[API /services/[id] DELETE] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar el servicio. Verificá si tiene turnos asociados.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Servicio eliminado exitosamente' })
  } catch (err) {
    console.error('[API /services/[id] DELETE] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
