// ============================================================
// Cliente Supabase para el navegador (Client Components)
// Utiliza createBrowserClient de @supabase/ssr para manejar
// cookies automáticamente en el lado del cliente.
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
