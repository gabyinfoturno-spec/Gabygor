'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function changePassword(prevState: { error?: string } | null, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  if (password === '12345' || password === '123456') {
    return { error: 'Por favor, elegí una contraseña diferente a la contraseña por defecto.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[Change Password] Error updating user:', error.message)
    return { error: 'Error al cambiar la contraseña: ' + error.message }
  }

  const cookieStore = await cookies()
  cookieStore.delete('gabygor_force_password_change')

  redirect('/admin')
}
