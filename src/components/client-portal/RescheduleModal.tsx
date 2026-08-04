'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Calendar } from '@/components/ui/Calendar'
import { TimeSlot } from '@/components/ui/TimeSlot'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatTime } from '@/lib/utils'
import type { Appointment, AvailableDate } from '@/lib/types'

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment & {
    service: {
      id: string
      name: string
    }
  }
  token?: string
  onSuccess: () => void
}

export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  token,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
  
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([])
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Rango de fechas dinámico inicializado en zona horaria de Argentina
  const [minDate] = useState(() => {
    return new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  })
  const [maxDate] = useState(() => {
    const base = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
    base.setDate(base.getDate() + 30)
    return base.toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  })

  // --- Fetch available dates ---
  useEffect(() => {
    if (!isOpen) return

    async function fetchDates() {
      setLoadingDates(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          serviceId: appointment.service.id,
          startDate: minDate,
          endDate: maxDate,
        })
        const res = await fetch(`/api/availability/dates?${params}`)
        if (!res.ok) throw new Error('Error al obtener fechas disponibles')
        const data = await res.json()
        setAvailableDates(data)
      } catch (err) {
        console.error(err)
        setError('Error al cargar las fechas disponibles.')
      } finally {
        setLoadingDates(false)
      }
    }

    fetchDates()
  }, [isOpen, appointment.service.id, minDate, maxDate])

  // --- Fetch available slots ---
  useEffect(() => {
    if (!selectedDate) {
      setSlots([])
      return
    }

    async function fetchSlots() {
      setLoadingSlots(true)
      setSelectedSlot(null)
      try {
        const params = new URLSearchParams({
          date: selectedDate || '',
          serviceId: appointment.service.id,
        })
        const res = await fetch(`/api/availability/slots?${params}`)
        if (!res.ok) throw new Error('Error al obtener horarios')
        const data = await res.json()
        setSlots(
          data.map((s: { slot_start: string; slot_end: string }) => ({
            start: s.slot_start,
            end: s.slot_end,
          }))
        )
      } catch (err) {
        console.error(err)
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, appointment.service.id])

  // --- Handle Reschedule ---
  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reschedule',
          newDate: selectedDate,
          newStartTime: selectedSlot.start,
          newEndTime: selectedSlot.end,
          token,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al reprogramar el turno')
      }

      toast('Turno reprogramado exitosamente.', 'success')
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Error al reprogramar el turno.'
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const availableDateStrings = availableDates.map((d) => d.available_date)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reprogramar Turno" maxWidth="lg">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Estás reprogramando tu turno para{' '}
            <strong className="text-[var(--text-primary)]">
              {appointment.service.name}
            </strong>.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-955/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Calendar Picker */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              1. Seleccioná el Día
            </h3>
            {loadingDates ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <Calendar
                availableDates={availableDateStrings}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                minDate={minDate}
                maxDate={maxDate}
              />
            )}
          </div>

          {/* Time Picker */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              2. Seleccioná el Horario
            </h3>
            {!selectedDate ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  Elegí una fecha para ver horarios disponibles
                </p>
              </div>
            ) : loadingSlots ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <TimeSlot
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}
          </div>
        </div>

        {/* Selected Summary */}
        {selectedDate && selectedSlot && (
          <div className="rounded-xl border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/5 p-4">
            <p className="text-sm text-[var(--text-primary)]">
              Nuevo turno propuesto:{' '}
              <strong className="text-[var(--gold-primary)]">
                {formatDate(selectedDate)} a las {formatTime(selectedSlot.start)}
              </strong>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedSlot}
            loading={submitting}
          >
            Confirmar Reprogramación
          </Button>
        </div>
      </div>
    </Modal>
  )
}
