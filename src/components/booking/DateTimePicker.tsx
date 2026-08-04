'use client'

import { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/Calendar'
import { TimeSlot } from '@/components/ui/TimeSlot'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTime } from '@/lib/utils'
import type { Service, AvailableDate } from '@/lib/types'

// --- Props ---

interface DateTimePickerProps {
  services: Service[]
  selectedDate: string | null
  selectedSlot: { start: string; end: string } | null
  onSelectDate: (date: string | null) => void
  onSelectSlot: (slot: { start: string; end: string } | null) => void
  onContinue: () => void
  onBack: () => void
}

/**
 * Paso 2 — Selección de fecha y hora.
 * Muestra un calendario con las fechas disponibles y
 * los horarios disponibles para la fecha seleccionada.
 */
export function DateTimePicker({
  services,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  onContinue,
  onBack,
}: DateTimePickerProps) {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [slots, setSlots] = useState<{ start: string; end: string; available?: boolean }[]>([])
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rango de fechas dinámico inicializado en zona horaria de Argentina
  const [minDate, setMinDate] = useState(() => {
    return new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  })
  const [maxDate, setMaxDate] = useState(() => {
    const base = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
    base.setDate(base.getDate() + 30)
    return base.toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  })

  const primaryServiceId = services[0]?.id

  // --- Cargar fechas disponibles y configuraciones de reserva ---
  useEffect(() => {
    if (!primaryServiceId) return

    async function fetchDatesAndSettings() {
      setLoadingDates(true)
      setError(null)

      try {
        // 1. Obtener configuraciones de reservas (mismo día y límite de días por adelantado)
        const settingsRes = await fetch('/api/settings')
        let allowSameDay = true
        let maxDays = 30

        if (settingsRes.ok) {
          const settingsMap = await settingsRes.json()
          allowSameDay = settingsMap.allow_same_day_booking !== 'false'
          maxDays = settingsMap.max_days_advance_booking ? parseInt(settingsMap.max_days_advance_booking, 10) : 30
        }

        // 2. Calcular fechas en zona horaria de Argentina
        const argentinaToday = new Date().toLocaleDateString('sv-SE', {
          timeZone: 'America/Argentina/Buenos_Aires',
        })

        let calculatedMinDate = argentinaToday
        if (!allowSameDay) {
          const tomorrow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
          tomorrow.setDate(tomorrow.getDate() + 1)
          calculatedMinDate = tomorrow.toLocaleDateString('sv-SE', {
            timeZone: 'America/Argentina/Buenos_Aires',
          })
        }

        const baseDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
        baseDate.setDate(baseDate.getDate() + maxDays)
        const calculatedMaxDate = baseDate.toLocaleDateString('sv-SE', {
          timeZone: 'America/Argentina/Buenos_Aires',
        })

        setMinDate(calculatedMinDate)
        setMaxDate(calculatedMaxDate)

        // 3. Cargar fechas disponibles en el rango calculado
        const params = new URLSearchParams({
          serviceId: primaryServiceId,
          startDate: calculatedMinDate,
          endDate: calculatedMaxDate,
        })

        const res = await fetch(`/api/availability/dates?${params}`)
        if (!res.ok) throw new Error('Error al cargar fechas')

        const data: AvailableDate[] = await res.json()
        setAvailableDates(data)
      } catch (err) {
        console.error('[DateTimePicker] Error loading dates and settings:', err)
        setError('No se pudieron cargar las fechas disponibles.')
      } finally {
        setLoadingDates(false)
      }
    }

    fetchDatesAndSettings()
  }, [primaryServiceId])

  // --- Cargar slots cuando cambia la fecha ---
  useEffect(() => {
    if (!selectedDate || services.length === 0) {
      setSlots([])
      return
    }

    async function fetchSlots() {
      setLoadingSlots(true)

      try {
        const params = new URLSearchParams({
          date: selectedDate!,
          serviceIds: services.map((s) => s.id).join(','),
        })

        const res = await fetch(`/api/availability/slots?${params}`)
        if (!res.ok) throw new Error('Error al cargar horarios')

        const data = await res.json()
        setSlots(data)
      } catch (err) {
        console.error('[DateTimePicker] Error fetching slots:', err)
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, services])

  // Extraer las fechas disponibles como array de strings para el calendario
  const availableDateStrings = availableDates.map((d) => d.available_date)

  return (
    <div className="space-y-6 max-sm:pb-24">
      {/* Título de sección */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
          Elegí fecha y hora
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Seleccioná el día y horario que más te convenga
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Contenido: Calendario + Horarios */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Calendario */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Fecha
          </h3>
          {loadingDates ? (
            <div className="space-y-2">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <Calendar
              availableDates={availableDateStrings}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
        </div>

        {/* Horarios */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Horario
          </h3>

          {!selectedDate ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] lg:h-64">
              <p className="text-sm text-[var(--text-muted)]">
                Seleccioná una fecha para ver los horarios
              </p>
            </div>
          ) : loadingSlots ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              </div>
            </div>
          ) : slots.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] lg:h-64">
              <p className="text-sm text-[var(--text-muted)]">
                No hay horarios disponibles para esta fecha
              </p>
            </div>
          ) : (
            <TimeSlot
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={onSelectSlot}
            />
          )}
        </div>
      </div>

      {/* Resumen de selección */}
      {selectedDate && selectedSlot && (
        <div className="rounded-xl border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold-primary)]/10">
              <svg
                className="h-5 w-5 text-[var(--gold-primary)]"
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
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {formatDate(selectedDate)}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex items-center justify-between pt-2 max-sm:sticky max-sm:bottom-0 max-sm:-mx-6 max-sm:-mb-6 max-sm:w-[calc(100%+3rem)] max-sm:rounded-b-2xl max-sm:z-40 max-sm:bg-[var(--bg-primary)] max-sm:border-t max-sm:border-[var(--border-color)] max-sm:p-4 max-sm:shadow-[0_-4px_12px_rgba(0,0,0,0.05)] max-sm:gap-3">
        <Button variant="ghost" onClick={onBack} className="max-sm:flex-1">
          ← Volver
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!selectedDate || !selectedSlot}
          onClick={onContinue}
          className="max-sm:flex-1"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
