'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { ClientSession } from '@/lib/auth/session'

export function ManageAppointmentsButton() {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // 1. Fetch token and redirect to client portal
  const redirectToClientPortal = async () => {
    setRedirecting(true)
    try {
      const res = await fetch('/api/clients/me')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se encontraron turnos registrados para este correo.')
      }
      const data = await res.json()
      router.push(`/mis-turnos/${data.accessToken}`)
    } catch (err: unknown) {
      console.error(err)
      const errorMsg = err instanceof Error ? err.message : 'Error al redirigir. Por favor, intentá de nuevo.'
      toast(errorMsg, 'error')
      setRedirecting(false)
    }
  }

  // 2. Check session from custom JWT cookie
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then(({ user }) => {
        setSession(user || null)
        // Si ya había una acción pendiente después del login OAuth
        if (user) {
          const pendingAction = localStorage.getItem('gabygor_action_after_auth')
          if (pendingAction === 'view_appointments') {
            localStorage.removeItem('gabygor_action_after_auth')
            setRedirecting(true)
            setTimeout(() => redirectToClientPortal(), 100)
          }
        }
      })
      .catch((err) => console.error('[ManageAppointmentsButton] Error checking session:', err))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3. Handle button click
  const handleClick = async () => {
    if (session) {
      // Already logged in: redirect immediately
      await redirectToClientPortal()
    } else {
      // Unauthenticated: initiate Google OAuth redirect
      setRedirecting(true)
      try {
        localStorage.setItem('gabygor_action_after_auth', 'view_appointments')
        window.location.href = '/api/auth/google?next=/'
      } catch (err: unknown) {
        console.error(err)
        toast('No se pudo iniciar sesión con Google. Intentá de nuevo.', 'error')
        localStorage.removeItem('gabygor_action_after_auth')
        setRedirecting(false)
      }
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="opacity-50" disabled>
        Mis Turnos
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      loading={redirecting}
      className="text-xs sm:text-sm border-[var(--gold-primary)] text-[var(--gold-primary)] hover:bg-[var(--gold-light)] font-semibold flex items-center gap-1.5"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      Mis Turnos
    </Button>
  )
}
