'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: { error?: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' }
  }

  const cleanEmail = email.toLowerCase().trim()
  const barberEmail = (process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com').toLowerCase().trim()

  // Restringir el ingreso únicamente a los administradores autorizados
  const allowedAdmins = [barberEmail, 'admin@admin.com'].filter(Boolean)
  if (!allowedAdmins.includes(cleanEmail)) {
    return { error: 'Acceso denegado. Este usuario no está registrado como administrador.' }
  }

  // Si ingresa con la pass 12345, mapearla internamente a 123456 debido a las restricciones de longitud de Supabase
  let finalPassword = password
  if (password === '12345') {
    finalPassword = '123456'
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: finalPassword,
  })

  if (error) {
    console.error('[Admin Login] Sign in error:', error.message)
    return { error: 'Credenciales incorrectas. Verificá tu correo y contraseña.' }
  }

  // Si es el barbero y entra con la contraseña por defecto, forzar el cambio de contraseña
  if (cleanEmail === barberEmail && (password === '12345' || password === '123456')) {
    const cookieStore = await cookies()
    cookieStore.set('gabygor_force_password_change', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutos para cambiarla
    })
    redirect('/admin/change-password')
  }

  redirect('/admin')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('gabygor_force_password_change')
  redirect('/admin/login')
}
