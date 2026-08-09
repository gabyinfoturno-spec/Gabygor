'use client'

import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AppointmentCard } from './AppointmentCard'
import { RescheduleModal } from './RescheduleModal'
import { CancelModal } from './CancelModal'
import Link from 'next/link'
import type { Appointment, Service } from '@/lib/types'

interface ClientPortalAppointment extends Appointment {
  service: Service
}

interface ClientPortalProps {
  client: {
    id: string
    fullName: string
    email: string
    accessToken: string
  }
}

export function ClientPortal({ client }: ClientPortalProps) {
  const [appointments, setAppointments] = useState<ClientPortalAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Tab state: 'upcoming' | 'history'
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')

  // Modal states
  const [rescheduleAppointment, setRescheduleAppointment] = useState<ClientPortalAppointment | null>(null)
  const [cancelAppointment, setCancelAppointment] = useState<ClientPortalAppointment | null>(null)

  // Fetch function
  const fetchAppointments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.accessToken}/appointments`)
      if (!res.ok) throw new Error('Error al obtener turnos')
      const data = await res.json()
      setAppointments(data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar tus turnos. Por favor, reintentá.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.accessToken])

  // Interceptar la navegación del botón 'Atrás' del navegador/gesto para ir al home
  useEffect(() => {
    const handlePopState = () => {
      window.location.href = '/'
    }

    window.history.pushState({ page: 'mis-turnos' }, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Filter appointments
  const upcoming = appointments.filter(
    (app) => app.status === 'pending' || app.status === 'confirmed'
  ).reverse() // Order asc (chronological) since fetched desc

  const history = appointments.filter(
    (app) =>
      app.status === 'completed' ||
      app.status === 'cancelled' ||
      app.status === 'rescheduled' ||
      app.status === 'no_show'
  )

  const activeList = activeTab === 'upcoming' ? upcoming : history

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] py-6 shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--gold-primary)] hover:bg-[var(--bg-primary)] transition-all shadow-sm"
              >
                <svg className="h-4 w-4 text-[var(--gold-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver al inicio</span>
              </button>
            </Link>
            <div className="space-y-0.5">
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-[var(--gold-primary)] sm:text-3xl">
                Hola, {client.fullName.split(' ')[0]}
              </h1>
              <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                Gestioná tus turnos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link href="/">
              <Button variant="outline" size="sm">
                + Reservar
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'upcoming'
                  ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Próximos turnos ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`border-b-2 px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'history'
                  ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Historial ({history.length})
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-955/20">
              <p className="mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAppointments}>
                Reintentar
              </Button>
            </div>
          )}

          {/* List or Loading */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : activeList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] py-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                {activeTab === 'upcoming'
                  ? 'No tenés turnos programados.'
                  : 'No tenés turnos en tu historial.'}
              </p>
              {activeTab === 'upcoming' && (
                <Link href="/" className="mt-4 inline-block">
                  <Button variant="primary">Reservar un turno ahora</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeList.map((app) => (
                <AppointmentCard
                  key={app.id}
                  appointment={app}
                  onReschedule={() => setRescheduleAppointment(app)}
                  onCancel={() => setCancelAppointment(app)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {rescheduleAppointment && (
        <RescheduleModal
          isOpen={!!rescheduleAppointment}
          onClose={() => setRescheduleAppointment(null)}
          appointment={rescheduleAppointment}
          token={client.accessToken}
          onSuccess={() => {
            setRescheduleAppointment(null)
            fetchAppointments()
          }}
        />
      )}

      {cancelAppointment && (
        <CancelModal
          isOpen={!!cancelAppointment}
          onClose={() => setCancelAppointment(null)}
          appointment={cancelAppointment}
          token={client.accessToken}
          onSuccess={() => {
            setCancelAppointment(null)
            fetchAppointments()
          }}
        />
      )}
    </div>
  )
}
