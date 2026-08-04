'use client'

import { Button } from '@/components/ui/Button'
import { formatDate, formatTime } from '@/lib/utils'
import type { Service } from '@/lib/types'

// --- Props ---

interface BookingConfirmationProps {
  services: Service[]
  date: string
  slot: { start: string; end: string }
  clientEmail: string
  accessToken: string
  onReset: () => void
}

/**
 * Pantalla de éxito después de confirmar un turno.
 * Muestra checkmark animado, resumen y acciones.
 */
export function BookingConfirmation({
  services,
  date,
  slot,
  clientEmail,
  accessToken,
  onReset,
}: BookingConfirmationProps) {
  const accessUrl = `/mis-turnos/${accessToken}`

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

      {/* Acciones */}
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
    </div>
  )
}
