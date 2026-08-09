'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import type { Service } from '@/lib/types'

// --- Props ---

interface BookingConfirmationProps {
  services: Service[]
  date: string
  slot: { start: string; end: string }
  clientEmail: string
  accessToken: string
  appointmentId: string
  onReset: () => void
}

/**
 * Pantalla de éxito después de confirmar un turno.
 * Muestra checkmark animado, resumen del turno y opción de pago con MP (si está habilitado).
 */
export function BookingConfirmation({
  services,
  date,
  slot,
  clientEmail,
  accessToken,
  appointmentId,
  onReset,
}: BookingConfirmationProps) {
  const accessUrl = `/mis-turnos/${accessToken}`
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [mpEnabled, setMpEnabled] = useState(false)
  const [loadingMp, setLoadingMp] = useState(false)
  const [paidOnSite, setPaidOnSite] = useState(false)

  // Verificar si MP está habilitado (bypasseando caché)
  useEffect(() => {
    fetch(`/api/settings?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setMpEnabled(data.mp_payments_enabled === 'true')
      })
      .catch(() => {})
      .finally(() => {
        setLoadingSettings(false)
      })
  }, [])

  const handlePayWithMP = async () => {
    setLoadingMp(true)
    try {
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      })

      const data = await res.json()
      if (!res.ok || !data.initPoint) {
        throw new Error(data.error || 'Error al generar el link de pago')
      }

      window.location.href = data.initPoint
    } catch (err) {
      console.error('[BookingConfirmation] MP error:', err)
      setLoadingMp(false)
      alert('No se pudo generar el link de pago. Intentá de nuevo o pagá en el momento.')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 py-8 text-center">
      {/* Checkmark animado */}
      <div className="flex justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Círculo exterior animado */}
          <div className="absolute inset-0 animate-[scale-in_0.4s_ease-out] rounded-full bg-green-100 dark:bg-green-900/30" />

          {/* Círculo interior */}
          <div className="relative flex h-16 w-16 animate-[scale-in_0.5s_ease-out_0.1s_both] items-center justify-center rounded-full bg-green-500">
            {/* Check icon */}
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: 'draw-check 0.4s ease-out 0.4s forwards',
                }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* CSS para animaciones */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      {/* Título */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text-primary)]">
          ¡Turno Reservado!
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Tu turno ha sido confirmado exitosamente
        </p>
      </div>

      {/* Resumen del turno */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-left">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-[var(--text-secondary)]">Servicio(s)</span>
            <span className="font-medium text-[var(--text-primary)] text-right max-w-[70%]">
              {services.map((s) => s.name).join(' + ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Fecha</span>
            <span className="font-medium text-[var(--text-primary)]">{formatDate(date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Horario</span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatTime(slot.start)} — {formatTime(slot.end)}
            </span>
          </div>
          <div className="border-t border-[var(--border-color)]" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Total</span>
            <span className="text-xl font-bold text-[var(--gold-primary)]">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Mensaje de email */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--gold-primary)]/5 border border-[var(--gold-primary)]/20 p-4">
        <svg
          className="h-5 w-5 flex-shrink-0 text-[var(--gold-primary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-[var(--text-secondary)]">
          Te enviamos un email de confirmación a{' '}
          <span className="font-medium text-[var(--text-primary)]">{clientEmail}</span>
        </p>
      </div>

      {/* Sección de pago con Mercado Pago */}
      {loadingSettings ? (
        <div className="flex items-center justify-center py-6">
          <span className="h-6 w-6 rounded-full border-2 border-t-[var(--gold-primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      ) : mpEnabled && !paidOnSite ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 text-left space-y-4">
          <div className="flex items-center gap-2">
            {/* Logo MP */}
            <svg className="h-6 w-6 flex-shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#009EE3"/>
              <path d="M13 24.5C13 18.149 18.149 13 24.5 13C30.851 13 36 18.149 36 24.5C36 30.851 30.851 36 24.5 36C18.149 36 13 30.851 13 24.5Z" fill="white"/>
              <path d="M24.5 17C21.467 17 19 19.467 19 22.5V25.5H30V22.5C30 19.467 27.533 17 24.5 17Z" fill="#009EE3"/>
            </svg>
            <div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                ¿Querés pagar tu turno ahora?
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Pagá con tarjeta, débito o saldo de MP y asegurá tu cita
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handlePayWithMP}
              disabled={loadingMp}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#009EE3] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMp ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  Generando link...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pagar {formatPrice(totalPrice)} con Mercado Pago
                </>
              )}
            </button>
            <button
              onClick={() => setPaidOnSite(true)}
              disabled={loadingMp}
              className="w-full rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Pagar en el momento
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => (window.location.href = accessUrl)}
          >
            Ver mis turnos
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={onReset}>
            Reservar otro turno
          </Button>
        </div>
      )}
    </div>
  )
}
