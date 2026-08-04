import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTime, formatPrice } from '@/lib/utils'
import Link from 'next/link'
import type { DashboardMetrics } from '@/lib/types'

export const revalidate = 0 // Always fetch fresh metrics

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Execute database RPC
  const { data: rawMetrics, error } = await supabase.rpc('get_dashboard_metrics')

  if (error) {
    console.error('[Admin Dashboard] RPC error:', error)
  }

  const metrics: DashboardMetrics = (rawMetrics as unknown as DashboardMetrics) || {
    appointments_today: 0,
    appointments_week: 0,
    appointments_month: 0,
    total_clients: 0,
    upcoming_appointments: [],
    top_services: [],
  }

  // Calcular ganancias acumuladas en el mes (turnos completados + adicionales de este mes)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

  const { data: completedAppointments } = await supabase
    .from('appointments')
    .select('service_id, additional_services, services(price)')
    .eq('status', 'completed')
    .gte('appointment_date', startOfMonthStr)

  const { data: allServices } = await supabase
    .from('services')
    .select('id, price')
  const servicesMap = new Map(allServices?.map((s) => [s.id, Number(s.price)]) || [])

  let monthlyEarnings = 0
  completedAppointments?.forEach((appt) => {
    const mainPrice = appt.services ? Number((appt.services as unknown as { price: number }).price) : 0
    monthlyEarnings += mainPrice

    if (appt.additional_services && appt.additional_services.length > 0) {
      appt.additional_services.forEach((id: string) => {
        const addPrice = servicesMap.get(id) || 0
        monthlyEarnings += addPrice
      })
    }
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Dashboard
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Resumen general del estado de los turnos y clientes
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card padding="md" className="flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Turnos Hoy
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--gold-primary)] sm:text-4xl">
            {metrics.appointments_today}
          </p>
        </Card>
        
        <Card padding="md" className="flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Esta Semana
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--gold-primary)] sm:text-4xl">
            {metrics.appointments_week}
          </p>
        </Card>

        <Card padding="md" className="flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Este Mes
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--gold-primary)] sm:text-4xl">
            {metrics.appointments_month}
          </p>
        </Card>

        <Card padding="md" className="flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Ganancias Mes
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--gold-primary)] sm:text-3xl md:text-4xl truncate">
            {formatPrice(monthlyEarnings)}
          </p>
        </Card>

        <Card padding="md" className="flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Clientes
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--gold-primary)] sm:text-4xl">
            {metrics.total_clients}
          </p>
        </Card>
      </div>

      {/* Main Grid: Upcoming Appointments vs Top Services */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
              Próximos Turnos
            </h3>
            <Link
              href="/admin/turnos"
              className="text-xs font-semibold text-[var(--gold-primary)] hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <Card padding="none" className="overflow-hidden">
            {metrics.upcoming_appointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No hay turnos pendientes para los próximos días.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {metrics.upcoming_appointments.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[var(--bg-secondary)]/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {app.client_name}
                        </span>
                        <Badge status={app.status} />
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {app.service_name} • {formatPrice(app.service_price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                        <svg className="h-4 w-4 text-[var(--gold-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(app.appointment_date)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                        <svg className="h-4 w-4 text-[var(--gold-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(app.start_time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Top Services Panel */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
            Servicios Más Solicitados
          </h3>

          <Card padding="md">
            {metrics.top_services.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No hay datos de servicios solicitados.
              </p>
            ) : (
              <div className="space-y-4">
                {metrics.top_services.map((service, index) => (
                  <div key={service.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {index + 1}. {service.name}
                      </span>
                      <span className="font-bold text-[var(--gold-primary)]">
                        {service.total_appointments}{' '}
                        <span className="text-xs font-normal text-[var(--text-secondary)]">
                          turnos
                        </span>
                      </span>
                    </div>
                    {/* Bar visualization */}
                    <div className="h-2 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--gold-primary)]"
                        style={{
                          width: `${Math.min(
                            100,
                            (service.total_appointments /
                              Math.max(
                                1,
                                ...metrics.top_services.map((s) => s.total_appointments)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
