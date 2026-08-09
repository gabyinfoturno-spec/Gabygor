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
  payment_status?: string
  mp_payment_id?: string
  paid_at?: string
}

/** Badge de estado de pago */
function PaymentBadge({ status }: { status?: string }) {
  if (!status || status === 'pending') return null

  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Pagado MP
      </span>
    )
  }
  if (status === 'pay_on_site') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
        </svg>
        Paga en local
      </span>
    )
  }
  if (status === 'refunded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Devuelto
      </span>
    )
  }
  return null
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null)
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
    const app = appointments.find((a) => a.id === id)

    if (action === 'cancel') {
      const hasPaid = app?.payment_status === 'paid'
      const result = await Swal.fire({
        title: '¿Cancelar turno?',
        html: hasPaid
          ? '<p>¿Estás seguro? <strong>Este cliente pagó con Mercado Pago.</strong><br>Podés devolver el pago desde el panel después de cancelar o hacerlo directamente desde mercadopago.com.ar.</p>'
          : '¿Estás seguro de que querés cancelar este turno? Esta acción no se puede deshacer.',
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

  const handleRefund = async (app: AdminAppointment) => {
    const result = await Swal.fire({
      title: '¿Devolver el pago?',
      html: `<p>Se procesará la devolución total de <strong>${formatPrice(app.services?.price || 0)}</strong> al cliente <strong>${app.clients?.full_name}</strong> a través de Mercado Pago.</p><p style="font-size:13px;color:#666;margin-top:8px;">El monto se acreditará en el medio de pago original del cliente.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C8A960',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Sí, devolver pago',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    })

    if (!result.isConfirmed) return

    setRefundLoadingId(app.id)
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: app.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar la devolución')

      toast('Devolución procesada correctamente. El cliente recibirá un email de confirmación.', 'success')
      fetchAppointments()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al procesar la devolución.', 'error')
    } finally {
      setRefundLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar turno definitivamente?',
      text: 'El turno se borrará por completo de la base de datos. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    })

    if (!result.isConfirmed) return

    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el turno')

      toast('Turno eliminado correctamente.', 'success')
      fetchAppointments()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al eliminar el turno.', 'error')
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">
                    {app.clients?.full_name || 'Cliente'}
                  </span>
                  <Badge status={app.status} />
                  <PaymentBadge status={app.payment_status} />
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

                {/* Aviso de pago MP en turno cancelado */}
                {app.status === 'cancelled' && app.payment_status === 'paid' && (
                  <div className="flex items-center gap-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 text-xs text-orange-800 dark:text-orange-300">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Este cliente pagó con MP. Podés devolver el pago desde aquí o desde <strong>mercadopago.com.ar</strong>.</span>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)] sm:border-none sm:pt-0 sm:items-end">
                <div className="flex flex-wrap gap-2 items-center sm:justify-end">
                  {(app.status === 'pending' || app.status === 'confirmed') && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAction(app.id, 'complete')}
                        disabled={actionLoadingId !== null || refundLoadingId !== null}
                        loading={actionLoadingId === app.id}
                      >
                        Completar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(app.id, 'no_show')}
                        disabled={actionLoadingId !== null || refundLoadingId !== null}
                      >
                        Ausente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReschedulingApp(app)}
                        disabled={actionLoadingId !== null || refundLoadingId !== null}
                      >
                        Reprogramar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(app.id, 'cancel')}
                        disabled={actionLoadingId !== null || refundLoadingId !== null}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}

                  {/* Botón devolución MP */}
                  {app.payment_status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(app)}
                      loading={refundLoadingId === app.id}
                      disabled={actionLoadingId !== null || (refundLoadingId !== null && refundLoadingId !== app.id)}
                      className="flex items-center gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Devolver pago MP
                    </Button>
                  )}

                  {/* Botón eliminar turno */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(app.id)}
                    disabled={actionLoadingId !== null || refundLoadingId !== null}
                    className="flex items-center gap-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                    title="Eliminar turno de la base de datos"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </Button>
                </div>
              </div>
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
