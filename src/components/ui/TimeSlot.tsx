'use client'

import { cn } from '@/lib/utils'

interface Slot {
  start: string
  end: string
  available?: boolean
}

interface TimeSlotProps {
  slots: Slot[]
  selectedSlot?: { start: string; end: string } | null
  onSelectSlot: (slot: { start: string; end: string }) => void
  loading?: boolean
}

export function TimeSlot({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
}: TimeSlotProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800 mb-3" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        </div>
        <div>
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800 mb-3" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
        No hay horarios disponibles para esta fecha
      </p>
    )
  }

  // Filtrar y agrupar por Mañana (antes de las 13:00) y Tarde (13:00 o más tarde)
  const morningSlots = slots.filter((slot) => {
    const hour = parseInt(slot.start.split(':')[0], 10)
    return hour < 13
  })

  const afternoonSlots = slots.filter((slot) => {
    const hour = parseInt(slot.start.split(':')[0], 10)
    return hour >= 13
  })

  const renderSlotGrid = (title: string, groupSlots: Slot[], isMorning: boolean) => {
    if (groupSlots.length === 0) return null

    return (
      <div className="space-y-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {isMorning ? (
            // Icono Sol
            <svg
              className="h-4 w-4 text-amber-500 animate-spin-slow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          ) : (
            // Icono Luna / Crepúsculo
            <svg
              className="h-4 w-4 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
          {title}
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {groupSlots.map((slot) => {
            const timeLabel = slot.start.slice(0, 5)
            const isSelected = selectedSlot?.start === slot.start
            const isAvailable = slot.available !== false

            return (
              <button
                key={slot.start}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (isAvailable) {
                    onSelectSlot(slot)
                  }
                }}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-all duration-200 focus:outline-none',
                  isSelected
                    ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)] text-white shadow-md shadow-[var(--gold-primary)]/20'
                    : isAvailable
                      ? 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/5 dark:hover:bg-[var(--gold-primary)]/10 cursor-pointer'
                      : 'border-[var(--border-color)]/50 bg-gray-100/50 dark:bg-gray-900/20 text-gray-400 dark:text-gray-600 line-through opacity-45 cursor-not-allowed border-dashed'
                )}
              >
                {timeLabel}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderSlotGrid('Mañana (antes de las 13:00)', morningSlots, true)}
      {renderSlotGrid('Tarde (desde las 13:00)', afternoonSlots, false)}
    </div>
  )
}
