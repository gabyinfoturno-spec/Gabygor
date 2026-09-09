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
          data
            .filter((s: { start: string; end: string; available: boolean }) => s.available)
            .map((s: { start: string; end: string }) => ({
              start: s.start,
              end: s.end,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Reprogramar Turno" maxWidth="3xl">
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
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              1. Seleccioná el Día
            </h3>
            {loadingDates ? (
              <Skeleton className="h-80 w-full rounded-2xl" />
            ) : (
              <div className="scale-110 origin-top-left w-[90%]">
                <Calendar
                  availableDates={availableDateStrings}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </div>
            )}
          </div>

          {/* Time Picker */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              2. Seleccioná el Horario
            </h3>
            {!selectedDate ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  Elegí una fecha para ver horarios disponibles
                </p>
              </div>
            ) : loadingSlots ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                <TimeSlot
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
              </div>
            )}
          </div>
        </div>

        {/* Selected Summary */}
        {selectedDate && selectedSlot && (
          <div className="flex items-center gap-4 rounded-xl border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/8 px-5 py-4">
            {/* Ícono */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold-primary)]/15">
              <svg className="h-5 w-5 text-[var(--gold-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {/* Texto */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gold-primary)] opacity-80">
                Nuevo turno propuesto
              </p>
              <p className="mt-0.5 text-base font-bold text-[var(--text-primary)]">
                {formatDate(selectedDate)}{' '}
                <span className="text-[var(--gold-primary)]">a las {formatTime(selectedSlot.start)}</span>
              </p>
            </div>
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
