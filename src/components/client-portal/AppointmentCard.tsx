'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime, formatPrice, canModifyAppointment } from '@/lib/utils'
import type { Appointment } from '@/lib/types'

interface AppointmentCardProps {
  appointment: Appointment & {
    service: {
      name: string
      price: number
      duration_minutes: number
    }
  }
  onReschedule: () => void
  onCancel: () => void
}

export function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
}: AppointmentCardProps) {
  const isPendingOrConfirmed =
    appointment.status === 'pending' || appointment.status === 'confirmed'

  // Checks the 2-hour rule
  const editable = canModifyAppointment(
    appointment.appointment_date,
    appointment.start_time
  )

  const showActions = isPendingOrConfirmed

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text-primary)]">
            {appointment.service?.name || 'Servicio'}
          </h3>
          <Badge status={appointment.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <svg
              className="h-4 w-4 text-[var(--gold-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(appointment.appointment_date)}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="h-4 w-4 text-[var(--gold-primary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {formatTime(appointment.start_time)}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formatPrice(appointment.service?.price || 0)}
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col items-stretch gap-2 pt-2 border-t border-[var(--border-color)] sm:flex-row sm:items-center sm:border-none sm:pt-0">
          {!editable ? (
            <p className="text-xs italic text-red-500 dark:text-red-400">
              Modificaciones bloqueadas (menos de 2 horas faltantes)
            </p>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onReschedule}>
                Reprogramar
              </Button>
              <Button variant="danger" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
