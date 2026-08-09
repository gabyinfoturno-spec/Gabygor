import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings
 * Fetches all site settings. Public endpoint.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: settings, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')

    if (error) {
      console.error('[API Settings GET] Error:', error)
      return NextResponse.json({ error: 'Error al obtener configuraciones' }, { status: 500 })
    }

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s) => {
      if (s.setting_key) {
        settingsMap[s.setting_key] = s.setting_value || ''
      }
    })

    return NextResponse.json(settingsMap, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    })
  } catch (err) {
    console.error('[API Settings GET] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/settings
 * Updates site settings.
 * Admin authenticated only.
 */
export async function PATCH(request: NextRequest) {
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

    // 2. Parse body (expect key-value object)
    const body = await request.json()
    const supabaseAdmin = createAdminClient()

    // 3. Update each setting
    const updatePromises = Object.entries(body).map(([key, value]) => {
      return supabaseAdmin
        .from('site_settings')
        .update({
          setting_value: value !== null && value !== undefined ? String(value) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key)
    })

    const results = await Promise.all(updatePromises)

    // Check for errors
    const hasError = results.some((r) => r.error)
    if (hasError) {
      console.error('[API Settings PATCH] Error updating settings:', results.map((r) => r.error).filter(Boolean))
      return NextResponse.json({ error: 'Error al guardar algunas configuraciones' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Configuraciones guardadas exitosamente' })
  } catch (err) {
    console.error('[API Settings PATCH] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
