// ============================================================
// Cliente Supabase para middleware (manejo de sesión en edge)
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Detectar si hay un código de autorización OAuth en la URL que no esté en la ruta callback.
  const code = request.nextUrl.searchParams.get('code');
  if (code && !pathname.startsWith('/auth/callback')) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/auth/callback';

    const originalParams = new URLSearchParams(request.nextUrl.search);
    originalParams.delete('code');

    const nextPath =
      pathname +
      (originalParams.toString() ? `?${originalParams.toString()}` : '');
    nextUrl.searchParams.set('code', code);
    nextUrl.searchParams.set('next', nextPath);

    return NextResponse.redirect(nextUrl);
  }

  // 2. Proteger y manejar sesión únicamente en rutas /admin
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname.startsWith('/admin/login');
    const isChangePasswordPage = pathname.startsWith('/admin/change-password');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        let supabaseResponse = NextResponse.next({ request });
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

        const { data: { user } } = await supabase.auth.getUser();

        if (!user && !isLoginPage) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin/login';
          return NextResponse.redirect(url);
        }

        const forcePasswordChange =
          request.cookies.get('gabygor_force_password_change')?.value === 'true';

        if (forcePasswordChange && !isChangePasswordPage && !isLoginPage) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin/change-password';
          return NextResponse.redirect(url);
        }

        return supabaseResponse;
      } catch (error) {
        console.error('[Middleware] Error al refrescar sesión:', error);
      }
    } else if (!isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request });
}
