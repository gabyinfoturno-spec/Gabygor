'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import type { Service } from '@/lib/types'
import type { ConfirmedBooking } from '@/hooks/useBooking'
import type { ClientSession } from '@/lib/auth/session'

// --- Props ---

interface ClientFormProps {
  services: Service[]
  date: string
  slot: { start: string; end: string }
  clientName: string
  clientEmail: string
  onChangeName: (name: string) => void
  onChangeEmail: (email: string) => void
  onConfirm: (booking: ConfirmedBooking) => void
  onBack: () => void
}

/**
 * Paso 3 — Datos del cliente y confirmación (Google OAuth obligatorio).
 * Muestra el resumen del turno y obliga a registrarse/iniciar sesión con Google
 * para agendar con un click, asegurando correos válidos y reales.
 */
export function ClientForm({
  services,
  date,
  slot,
  clientName,
  clientEmail,
  onChangeName,
  onChangeEmail,
  onConfirm,
  onBack,
}: ClientFormProps) {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // --- 1. Confirmar la reserva (Función principal de envío) ---
  const executeBooking = useCallback(async (name: string, email: string) => {
    setApiError(null)
    const primaryService = services[0]
    const additionalServiceIds = services.slice(1).map((s) => s.id)

    if (!primaryService || !email || !name) {
      setApiError('Faltan los datos del cliente autenticado.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: primaryService.id,
          additionalServices: additionalServiceIds,
          date,
          startTime: slot.start,
          endTime: slot.end,
          clientName: name.trim(),
          clientEmail: email.trim().toLowerCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Error al confirmar el turno')
        return
      }

      // Éxito — notificar al componente padre
      onConfirm({
        appointmentId: data.appointment.id,
        accessToken: data.client.accessToken,
      })
    } catch {
      setApiError('Error de conexión. Por favor, intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }, [services, date, slot, onConfirm])

  // --- 2. Verificar sesión activa al montar (desde cookie JWT propia) ---
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        const activeSession: ClientSession | null = data.user || null
        setSession(activeSession)

        if (activeSession) {
          onChangeName(activeSession.name)
          onChangeEmail(activeSession.email)

          // Auto-confirmar si viene de la redirección de Google OAuth
          const autoConfirm = localStorage.getItem('gabygor_auto_confirm')
          if (autoConfirm === 'true') {
            localStorage.removeItem('gabygor_auto_confirm')
            executeBooking(activeSession.name, activeSession.email)
          }
        }
      } catch (err) {
        console.error('[ClientForm] Error checking auth session:', err)
      } finally {
        setLoadingSession(false)
      }
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- 3. Guardar estado y redirigir a Google OAuth ---
  const handleGoogleLogin = () => {
    // Indicar que se autoconfirme el turno al retornar
    localStorage.setItem('gabygor_auto_confirm', 'true')

    // Persistir el progreso actual del flujo en localStorage
    localStorage.setItem('gabygor_booking_state', JSON.stringify({
      selectedServices: services,
      selectedDate: date,
      selectedSlot: slot,
      step: 3
    }))

    // Redirigir al flujo OAuth propio (sin Supabase)
    window.location.href = '/api/auth/google?next=/'
  }

  // --- 3.5 Cerrar sesión actual y redirigir a Google OAuth ---
  const handleChangeAccount = async () => {
    try {
      setLoadingSession(true)

      // Destruir sesión actual
      await fetch('/api/auth/signout', { method: 'POST' })
      setSession(null)
      onChangeName('')
      onChangeEmail('')

      // Indicar que se autoconfirme el turno al retornar
      localStorage.setItem('gabygor_auto_confirm', 'true')

      // Persistir el progreso actual del flujo en localStorage
      localStorage.setItem('gabygor_booking_state', JSON.stringify({
        selectedServices: services,
        selectedDate: date,
        selectedSlot: slot,
        step: 3
      }))

      window.location.href = '/api/auth/google?next=/'
    } catch (err) {
      console.error('[ClientForm] Error changing account:', err)
      setApiError('No se pudo redirigir a Google. Intentá de nuevo.')
      setLoadingSession(false)
    }
  }

  // --- 4. Confirmar la reserva manualmente ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await executeBooking(clientName, clientEmail)
  }

  const totalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
        {/* Spinner animado premium */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Anillo de fondo */}
          <div className="h-16 w-16 rounded-full border-4 border-[var(--gold-primary)]/10"></div>
          {/* Arco rotatorio */}
          <div className="absolute h-16 w-16 rounded-full border-4 border-t-[var(--gold-primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        
        <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text-primary)] mb-2">
          Confirmando tu turno...
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">
          Estamos registrando tu cita en el sistema y preparando tus correos de confirmación.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-sm:pb-24">
      {/* Título de sección */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
          Confirmá tu turno
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {session 
            ? 'Confirmá tu reserva con un solo click' 
            : 'Registrá tu correo para poder agendar el turno con un click y listo'
          }
        </p>
      </div>

      {/* Resumen del turno */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Resumen del turno
        </h3>
        <div className="space-y-3">
          {/* Servicios */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="text-sm text-[var(--text-secondary)]">Servicios</span>
              <span className="font-semibold text-sm text-[var(--text-primary)] text-right max-w-[70%]">
                {services.map((s) => s.name).join(' + ')}
              </span>
            </div>
            {services.length > 1 && (
              <div className="text-[10px] text-[var(--text-muted)] text-right">
                {services.map((s) => `${s.name} (${s.duration_minutes} min)`).join(', ')}
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Fecha</span>
            <span className="font-medium text-[var(--text-primary)]">{formatDate(date)}</span>
          </div>

          {/* Horario */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Horario</span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatTime(slot.start)} — {formatTime(slot.end)}
            </span>
          </div>

          {/* Duración Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Duración total</span>
            <span className="font-medium text-[var(--text-primary)]">{totalDuration} minutos</span>
          </div>

          {/* Separador */}
          <div className="border-t border-[var(--border-color)]" />

          {/* Precio */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Total</span>
            <span className="text-xl font-bold text-[var(--gold-primary)]">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Flujo de Autenticación de Google */}
      <div className="space-y-4">
        {loadingSession ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : session ? (
          // Logueado: Mostrar resumen de perfil y botón de confirmación
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-[var(--border-color)] p-4 bg-[var(--bg-primary)] flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-[var(--gold-primary)] uppercase tracking-wider">
                  Cuenta de Google vinculada
                </p>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                  {clientName}
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {clientEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={handleChangeAccount}
                className="text-xs text-red-500 hover:text-red-600 hover:underline font-semibold transition-colors"
              >
                Cambiar cuenta
              </button>
            </div>

            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {apiError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 max-sm:sticky max-sm:bottom-0 max-sm:-mx-6 max-sm:-mb-6 max-sm:w-[calc(100%+3rem)] max-sm:rounded-b-2xl max-sm:z-40 max-sm:bg-[var(--bg-primary)] max-sm:border-t max-sm:border-[var(--border-color)] max-sm:p-4 max-sm:shadow-[0_-4px_12px_rgba(0,0,0,0.05)] max-sm:gap-3">
              <Button variant="ghost" type="button" onClick={onBack} disabled={submitting} className="max-sm:flex-1">
                ← Volver
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={submitting}
                fullWidth={false}
                className="max-sm:flex-1"
              >
                Confirmar Turno
              </Button>
            </div>
          </form>
        ) : (
          // No logueado: Botón de iniciar sesión con Google
          <div className="space-y-6 pt-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--gold-primary)] transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold-primary)]/30 cursor-pointer"
            >
              {/* Google Brand Icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.08.56 4.22 1.66l3.15-3.15C17.45 1.74 14.93 1 12 1 7.35 1 3.29 3.67 1.25 7.57l3.87 3c.92-2.74 3.48-4.53 6.88-4.53z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.91 3.41-8.6z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.4 0-5.96-1.79-6.88-4.53H3.14v3.09C5.18 20.33 9.24 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.12 13.79c-.24-.7-.37-1.45-.37-2.23s.13-1.53.37-2.23V6.24H3.14C2.41 7.7 2 9.35 2 11.11c0 1.76.41 3.41 1.14 4.87l1.98-2.19z"
                />
              </svg>
              Iniciar Sesión con Google
            </button>

            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {apiError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 max-sm:sticky max-sm:bottom-0 max-sm:-mx-6 max-sm:-mb-6 max-sm:w-[calc(100%+3rem)] max-sm:rounded-b-2xl max-sm:z-40 max-sm:bg-[var(--bg-primary)] max-sm:border-t max-sm:border-[var(--border-color)] max-sm:p-4 max-sm:shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <Button variant="ghost" type="button" onClick={onBack} className="max-sm:w-full">
                ← Volver
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
