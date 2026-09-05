// ============================================================
// Manejo de sesión de clientes (Google OAuth propio)
// JWT firmado con NEXTAUTH_SECRET, guardado en cookie httpOnly
// ============================================================

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'gabygor_client_session'
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60 // 7 días

export interface ClientSession {
  email: string
  name: string
  picture?: string
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET no está configurado')
  return new TextEncoder().encode(secret)
}

/** Crea un JWT firmado con los datos del usuario */
export async function createSessionToken(user: ClientSession): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, picture: user.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/** Lee y verifica el JWT desde la cookie (en Server Components / API routes) */
export async function getClientSession(request?: NextRequest): Promise<ClientSession | null> {
  try {
    let token: string | undefined

    if (request) {
      // Desde middleware / route handlers con NextRequest
      token = request.cookies.get(SESSION_COOKIE)?.value
    } else {
      // Desde Server Components / Server Actions
      const cookieStore = await cookies()
      token = cookieStore.get(SESSION_COOKIE)?.value
    }

    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())

    return {
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string | undefined,
    }
  } catch {
    return null
  }
}

/** Opciones de cookie segura para producción */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  }
}
