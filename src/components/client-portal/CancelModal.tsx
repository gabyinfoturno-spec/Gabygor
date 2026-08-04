'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatTime } from '@/lib/utils'
import type { Appointment } from '@/lib/types'

interface CancelModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment & {
    service: {
      name: string
    }
  }
  token: string
  onSuccess: () => void
}

export function CancelModal({
  isOpen,
  onClose,
  appointment,
  token,
  onSuccess,
}: CancelModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleCancel = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          token,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cancelar el turno')
      }

      toast('Turno cancelado exitosamente.', 'success')
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
      setError(message)
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Turno" maxWidth="sm">
      <div className="space-y-6">
        <p className="text-sm text-[var(--text-secondary)]">
          ¿Estás seguro de que querés cancelar tu turno para{' '}
          <strong className="text-[var(--text-primary)]">
            {appointment.service.name}
          </strong>{' '}
          el día{' '}
          <strong>{formatDate(appointment.appointment_date)}</strong> a las{' '}
          <strong>{formatTime(appointment.start_time)}</strong>?
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-955/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            No, mantener
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleCancel}
            loading={loading}
          >
            Sí, cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
