'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import type { Appointment } from '@/lib/types'
import Swal from 'sweetalert2'
import { RescheduleModal } from '@/components/client-portal/RescheduleModal'

interface AdminAppointment extends Appointment {
  clients: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
  services: {
    id: string
    name: string
    price: number
    duration_minutes: number
  }
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [reschedulingApp, setReschedulingApp] = useState<AdminAppointment | null>(null)
  const { toast } = useToast()

  const fetchAppointments = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (dateFilter) params.append('date', dateFilter)

      const res = await fetch(`/api/appointments?${params}`)
      if (!res.ok) throw new Error('Error al cargar turnos')
      const data = await res.json()
      setAppointments(data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron obtener los turnos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter])

  const handleAction = async (id: string, action: 'complete' | 'no_show' | 'cancel') => {
    if (action === 'cancel') {
      const result = await Swal.fire({
        title: '¿Cancelar turno?',
        text: '¿Estás seguro de que querés cancelar este turno? Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#1a1a1a',
        confirmButtonText: 'Sí, cancelar turno',
        cancelButtonText: 'No, mantener',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      })
      if (!result.isConfirmed) return
    }

    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el turno')
      }

      if (action === 'complete') {
        const earnings = data.monthlyEarnings || 0
        await Swal.fire({
          title: '¡Turno Completado!',
          text: `Las ganancias acumuladas en este mes son ${formatPrice(earnings)}.`,
          icon: 'success',
          confirmButtonColor: '#C8A960',
          confirmButtonText: 'Excelente',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        })
      } else {
        toast('Turno actualizado correctamente.', 'success')
      }
      
      fetchAppointments()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al procesar la acción.', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetFilters = () => {
    setStatusFilter('')
    setDateFilter('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Turnos
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Buscá, filtrá y gestioná las citas agendadas
        </p>
      </div>

      {/* Filters Card */}
      <Card padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Estado
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
            <option value="rescheduled">Reprogramados</option>
            <option value="no_show">No asistió</option>
          </select>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Fecha
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
          />
        </div>

        {(statusFilter || dateFilter) && (
          <Button variant="ghost" onClick={handleResetFilters} className="sm:mb-0.5">
            Limpiar Filtros
          </Button>
        )}
      </Card>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchAppointments}>
            Reintentar
          </Button>
        </Card>
      ) : appointments.length === 0 ? (
        <Card className="py-12 text-center text-sm text-[var(--text-secondary)]">
          No se encontraron turnos con los filtros seleccionados.
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((app) => (
            <Card
              key={app.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-[var(--text-primary)]">
                    {app.clients?.full_name || 'Cliente'}
                  </span>
                  <Badge status={app.status} />
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {app.clients?.email} {app.clients?.phone ? `• ${app.clients.phone}` : ''}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {app.services?.name || 'Servicio'} ({formatPrice(app.services?.price || 0)})
                  </span>
                  <span>
                    Fecha: {formatDate(app.appointment_date)}
                  </span>
                  <span>
                    Hora: {formatTime(app.start_time)} — {formatTime(app.end_time)}
                  </span>
                </div>
              </div>

              {/* Admin Actions */}
              {(app.status === 'pending' || app.status === 'confirmed') && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-color)] sm:border-none sm:pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAction(app.id, 'complete')}
                    disabled={actionLoadingId !== null}
                    loading={actionLoadingId === app.id}
                  >
                    Completar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAction(app.id, 'no_show')}
                    disabled={actionLoadingId !== null}
                  >
                    Ausente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReschedulingApp(app)}
                    disabled={actionLoadingId !== null}
                  >
                    Reprogramar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleAction(app.id, 'cancel')}
                    disabled={actionLoadingId !== null}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {reschedulingApp && (
        <RescheduleModal
          isOpen={!!reschedulingApp}
          onClose={() => setReschedulingApp(null)}
          appointment={{
            ...reschedulingApp,
            service: {
              id: reschedulingApp.services.id,
              name: reschedulingApp.services.name,
            }
          }}
          onSuccess={() => {
            setReschedulingApp(null)
            fetchAppointments()
          }}
        />
      )}
    </div>
  )
}
