'use client'

import { useState, useMemo, useCallback } from 'react'

export interface CalendarProps {
  /** Fechas disponibles para seleccionar (pueden ser objetos Date o strings YYYY-MM-DD) */
  availableDates?: (Date | string)[]
  /** Fechas bloqueadas (ej. feriados, vacaciones, formato YYYY-MM-DD) */
  blockedDates?: string[]
  /** Fecha seleccionada actualmente */
  selectedDate?: Date | string | null
  /** Callback cuando se selecciona una fecha (retorna el string YYYY-MM-DD) */
  onSelectDate: (date: string) => void
  /** Fecha mínima seleccionable */
  minDate?: Date | string
  /** Fecha máxima seleccionable */
  maxDate?: Date | string
  className?: string
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// --- Helper: Parsear Date o String a objeto Date limpio (sin hora) ---
function parseToDate(d: Date | string | undefined | null): Date | null {
  if (!d) return null
  if (d instanceof Date) {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
  }
  
  // Si es YYYY-MM-DD
  const parts = d.split('-')
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      0, 0, 0, 0
    )
  }
  
  const parsed = new Date(d)
  parsed.setHours(0, 0, 0, 0)
  return isNaN(parsed.getTime()) ? null : parsed
}

function formatDateToString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startPad = firstDay.getDay() - 1
  if (startPad < 0) startPad = 6 // Domingo es 6

  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

export function Calendar({
  availableDates = [],
  blockedDates = [],
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  className = '',
}: CalendarProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const parsedSelectedDate = useMemo(() => parseToDate(selectedDate), [selectedDate])
  const parsedMinDate = useMemo(() => parseToDate(minDate), [minDate])
  const parsedMaxDate = useMemo(() => parseToDate(maxDate), [maxDate])

  const [viewYear, setViewYear] = useState(
    parsedSelectedDate?.getFullYear() ?? today.getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(
    parsedSelectedDate?.getMonth() ?? today.getMonth()
  )

  const availableSet = useMemo(() => {
    const set = new Set<string>()
    availableDates.forEach((dateInput) => {
      const p = parseToDate(dateInput)
      if (p) {
        set.add(formatDateToString(p))
      }
    })
    return set
  }, [availableDates])

  const isAvailable = useCallback(
    (d: Date) => {
      if (availableDates.length === 0) return true
      return availableSet.has(formatDateToString(d))
    },
    [availableDates, availableSet]
  )

  const days = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const canGoPrev = (() => {
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    if (parsedMinDate) {
      return (
        prevYear > parsedMinDate.getFullYear() ||
        (prevYear === parsedMinDate.getFullYear() && prevMonth >= parsedMinDate.getMonth())
      )
    }
    return true
  })()

  const canGoNext = (() => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
    if (parsedMaxDate) {
      return (
        nextYear < parsedMaxDate.getFullYear() ||
        (nextYear === parsedMaxDate.getFullYear() && nextMonth <= parsedMaxDate.getMonth())
      )
    }
    return true
  })()

  return (
    <div className={`w-full max-w-sm mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 sm:p-5 ${className}`}>
      {/* Month/Year Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrev}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mes anterior"
        >
          <ChevronLeft />
        </button>

        <span className="font-heading text-base font-semibold text-[var(--text-primary)] select-none">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoNext}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Mes siguiente"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div key={i} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-1 select-none">
            {name}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }

          const isToday = isSameDay(day, today)
          const isSelected = parsedSelectedDate ? isSameDay(day, parsedSelectedDate) : false
          const available = isAvailable(day)
          const isPast = day < today && !isToday
          const isBeforeMin = parsedMinDate ? day < parsedMinDate : false
          const isAfterMax = parsedMaxDate ? day > parsedMaxDate : false
          const dateStr = formatDateToString(day)
          const isBlocked = blockedDates.includes(dateStr)
          const isDisabled = isPast || isBeforeMin || isAfterMax || (!available && !isBlocked)

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled && !isBlocked} // Keep clickable if blocked so admin can select it
              onClick={() => onSelectDate(dateStr)}
              className={[
                'relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150',
                isSelected
                  ? 'bg-[var(--gold-primary)] text-white shadow-[var(--shadow-gold)]'
                  : isBlocked
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30 cursor-pointer'
                  : !isDisabled
                  ? 'text-[var(--text-primary)] hover:bg-[var(--gold-light)] hover:text-[var(--gold-primary)] cursor-pointer'
                  : 'text-[var(--text-tertiary)] opacity-40 cursor-not-allowed',
              ].join(' ')}
              aria-label={day.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              aria-pressed={isSelected}
            >
              {day.getDate()}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--gold-primary)]" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
