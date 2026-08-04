import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/admin/blocked-dates/[id]
 * Deletes a blocked date.
 * Admin authenticated only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID de bloqueo es requerido' }, { status: 400 })
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

    // Delete blocked date
    const { error: deleteError } = await supabaseAdmin
      .from('blocked_dates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[API Blocked Dates DELETE] Delete error:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar el bloqueo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Bloqueo eliminado exitosamente' })
  } catch (err) {
    console.error('[API Blocked Dates DELETE] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
