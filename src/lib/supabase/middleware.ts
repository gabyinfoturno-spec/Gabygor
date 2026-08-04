// ============================================================
// Cliente Supabase para middleware (manejo de sesión en edge)
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Detectar si hay un código de autorización OAuth en la URL que no esté en la ruta callback.
  // Esto hace que el flujo sea robusto si la redirección configurada en Supabase cae al Site URL (/).
  const code = request.nextUrl.searchParams.get('code');
  if (code && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/auth/callback';

    // Obtener parámetros originales eliminando el code para el redirect 'next'
    const originalParams = new URLSearchParams(request.nextUrl.search);
    originalParams.delete('code');

    const nextPath =
      request.nextUrl.pathname +
      (originalParams.toString() ? `?${originalParams.toString()}` : '');
    nextUrl.searchParams.set('code', code);
    nextUrl.searchParams.set('next', nextPath);

    return NextResponse.redirect(nextUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si faltan las variables de entorno, dejar pasar sin crash
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Middleware] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas');
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Refrescar sesión si existe
    const { data: { user } } = await supabase.auth.getUser();

    // Proteger rutas admin: redirigir a login si no hay sesión
    if (
      !user &&
      request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    // Verificar si se requiere forzar el cambio de contraseña
    const forcePasswordChange = request.cookies.get('gabygor_force_password_change')?.value === 'true';

    if (
      forcePasswordChange &&
      request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/change-password') &&
      !request.nextUrl.pathname.startsWith('/admin/login')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/change-password';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[Middleware] Error al refrescar sesión:', error);
    // No crashear, dejar pasar la request
  }

  return supabaseResponse;
}
