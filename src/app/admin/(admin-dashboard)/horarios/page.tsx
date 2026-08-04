'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toggle } from '@/components/ui/index' // Toggle is in the index.tsx
import { useToast } from '@/components/ui/Toast'
import { getDayName } from '@/lib/utils'
import type { WorkingHours } from '@/lib/types'

export default function AdminWorkingHoursPage() {
  const [schedule, setSchedule] = useState<WorkingHours[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const { toast } = useToast()

  const fetchHours = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/working-hours')
      if (!res.ok) throw new Error('Error al cargar horarios')
      const data = await res.json()
      
      // If table is empty, initialize default hours (e.g. Mon-Fri 9-18, Sat 9-13, Sun closed)
      if (data.length === 0) {
        const defaultSchedule = Array.from({ length: 7 }).map((_, i) => ({
          day_of_week: i,
          is_working_day: i !== 0, // Domingo inactivo
          start_time: '09:00',
          end_time: i === 6 ? '13:00' : '18:00',
          interval_minutes: 30,
        })) as unknown as WorkingHours[]
        setSchedule(defaultSchedule)
      } else {
        setSchedule(data)
      }
    } catch (err) {
      console.error(err)
      setError('No se pudo obtener la configuración de horarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHours()
  }, [])

  const handleToggleDay = (index: number, checked: boolean) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, is_working_day: checked } : day))
    )
  }

  const handleTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [field]: value } : day))
    )
  }

  const handleIntervalChange = (index: number, value: number) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, interval_minutes: value } : day))
    )
  }

  const handleSave = async () => {
    // Basic validation
    for (const day of schedule) {
      if (day.is_working_day) {
        if (!day.start_time || !day.end_time) {
          toast(`Por favor completá los horarios para el día ${getDayName(day.day_of_week)}.`, 'error')
          return
        }
        if (day.start_time >= day.end_time) {
          toast(`El horario de inicio debe ser menor al de fin para el ${getDayName(day.day_of_week)}.`, 'error')
          return
        }
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/working-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar horarios')
      }

      toast('Horarios guardados exitosamente.', 'success')
      fetchHours()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al guardar configuración.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Sort schedule in Argentine way: Lunes (1) to Domingo (0)
  const orderedSchedule = [...schedule].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0] // Lunes, Martes, ..., Domingo
    return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Horarios Laborales
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Definí tus días laborales, horarios de atención e intervalos de turnos
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Guardar Cambios
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchHours}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden divide-y divide-[var(--border-color)]">
          {orderedSchedule.map((day) => {
            // Find the original index in schedule array to update correctly
            const originalIndex = schedule.findIndex((s) => s.day_of_week === day.day_of_week)

            return (
              <div
                key={day.day_of_week}
                className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${
                  !day.is_working_day ? 'bg-gray-50/50 dark:bg-gray-900/10' : ''
                }`}
              >
                {/* Day name & toggle */}
                <div className="flex items-center justify-between sm:w-1/4">
                  <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">
                    {getDayName(day.day_of_week)}
                  </span>
                  <Toggle
                    checked={day.is_working_day}
                    onChange={(checked) => handleToggleDay(originalIndex, checked)}
                    label={day.is_working_day ? 'Abierto' : 'Cerrado'}
                  />
                </div>

                {/* Times & Intervals */}
                {day.is_working_day ? (
                  <div className="flex flex-1 flex-wrap items-center gap-4 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Desde:</span>
                      <input
                        type="time"
                        value={day.start_time?.slice(0, 5) || ''}
                        onChange={(e) => handleTimeChange(originalIndex, 'start_time', e.target.value)}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Hasta:</span>
                      <input
                        type="time"
                        value={day.end_time?.slice(0, 5) || ''}
                        onChange={(e) => handleTimeChange(originalIndex, 'end_time', e.target.value)}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Intervalo:</span>
                      <select
                        value={day.interval_minutes}
                        onChange={(e) => handleIntervalChange(originalIndex, parseInt(e.target.value, 10))}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                      >
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="flex-1 text-right text-xs italic text-[var(--text-secondary)] sm:pr-8">
                    No se atiende este día
                  </p>
                )}
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
