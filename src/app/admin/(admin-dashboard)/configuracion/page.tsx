'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toggle } from '@/components/ui/index'
import { useToast } from '@/components/ui/Toast'
import Swal from 'sweetalert2'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [mainTitle, setMainTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [infoText, setInfoText] = useState('')
  const [currentCity, setCurrentCity] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [infoMessageVisible, setInfoMessageVisible] = useState(false)
  const [barberEmail, setBarberEmail] = useState('')
  const [barberPhone, setBarberPhone] = useState('')
  const [barberInstagram, setBarberInstagram] = useState('')
  
  // Booking settings
  const [minHours, setMinHours] = useState('2')
  const [maxDays, setMaxDays] = useState('30')
  const [reminderHours, setReminderHours] = useState('24')
  const [allowSameDayBooking, setAllowSameDayBooking] = useState(true)

  const { toast } = useToast()
  const [loadingNotify, setLoadingNotify] = useState<string | null>(null)

  const handleQuickLocationNotify = async (city: 'Puerto Iguazú' | 'Posadas') => {
    const result = await Swal.fire({
      title: '¿Confirmar cambio y notificar?',
      text: `¿Estás seguro de que querés actualizar la ubicación actual en el sitio a "${city}" y enviar un correo electrónico masivo a todos tus clientes registrados notificándoles el cambio?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C8A960',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Sí, notificar clientes',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    })

    if (!result.isConfirmed) return

    setLoadingNotify(city)
    try {
      // 1. Update settings in the database
      const settingsRes = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          main_title: mainTitle,
          subtitle,
          info_text: infoText,
          current_city: city, // Force update to selected city
          info_message: infoMessage,
          info_message_visible: String(infoMessageVisible),
          barber_email: barberEmail,
          barber_phone: barberPhone,
          barber_instagram: barberInstagram,
          min_hours_before_modification: minHours,
          max_days_advance_booking: maxDays,
          reminder_hours_before: reminderHours,
          allow_same_day_booking: String(allowSameDayBooking),
        }),
      })

      if (!settingsRes.ok) {
        const data = await settingsRes.json()
        throw new Error(data.error || 'Error al actualizar la ubicación actual')
      }

      // 2. Call the campaign API to send an email to all clients
      const subject = `¡Novedades de GabyGor! Nueva ubicación: ${city}`
      const emailContent = `<p>Hola,</p><p>Te informo que actualmente estoy atendiendo en la ciudad de <strong>${city}</strong>.</p><p>Ya podés agendar tu turno desde nuestra web de reservas de forma rápida y sencilla.</p><p>¡Te espero!</p>`

      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          content: emailContent,
          segment_type: 'all',
        }),
      })

      if (!campaignRes.ok) {
        const data = await campaignRes.json()
        throw new Error(data.error || 'Error al enviar el correo masivo')
      }

      toast(`Ubicación cambiada a ${city} y correo enviado con éxito a todos los clientes.`, 'success')
      
      // Update UI state
      setCurrentCity(city)
    } catch (err: unknown) {
      console.error('[QuickLocationNotify] Error:', err)
      toast(err instanceof Error ? err.message : 'Error al cambiar la ubicación y notificar.', 'error')
    } finally {
      setLoadingNotify(null)
    }
  }

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Error al cargar configuraciones')
      const data = await res.json()
      
      setMainTitle(data.main_title || '')
      setSubtitle(data.subtitle || '')
      setInfoText(data.info_text || '')
      setCurrentCity(data.current_city || '')
      setInfoMessage(data.info_message || '')
      setInfoMessageVisible(data.info_message_visible === 'true')
      setBarberEmail(data.barber_email || '')
      setBarberPhone(data.barber_phone || '')
      setBarberInstagram(data.barber_instagram || '')
      setMinHours(data.min_hours_before_modification || '2')
      setMaxDays(data.max_days_advance_booking || '30')
      setReminderHours(data.reminder_hours_before || '24')
      setAllowSameDayBooking(data.allow_same_day_booking !== 'false')
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las configuraciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          main_title: mainTitle,
          subtitle,
          info_text: infoText,
          current_city: currentCity,
          info_message: infoMessage,
          info_message_visible: String(infoMessageVisible),
          barber_email: barberEmail,
          barber_phone: barberPhone,
          barber_instagram: barberInstagram,
          min_hours_before_modification: minHours,
          max_days_advance_booking: maxDays,
          reminder_hours_before: reminderHours,
          allow_same_day_booking: String(allowSameDayBooking),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar configuraciones')
      }

      toast('Configuraciones guardadas exitosamente.', 'success')
      fetchSettings()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al guardar configuraciones.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Configuración del Sitio
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Editá los datos del barbero, textos de la web y límites de reserva
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchSettings}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Web Details Card */}
          <Card padding="md" className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Diseño e Identidad de la Web
            </h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Título Principal"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                required
                placeholder="GabyGor"
              />
              <Input
                label="Subtítulo (Opcional)"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ej: Estilismo"
              />
            </div>

            <Input
              label="Texto de Bienvenida / Eslogan"
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              required
              placeholder="Reservá tu turno de forma rápida y sencilla"
            />
          </Card>

          {/* Location & Banner Details */}
          <Card padding="md" className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Ubicación y Anuncios
            </h3>

            <Input
              label="Ciudad Actual"
              value={currentCity}
              onChange={(e) => setCurrentCity(e.target.value)}
              placeholder="Puerto Iguazú"
            />

            <div className="flex flex-col gap-2 pt-1 pb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Notificar cambio de ubicación a todos los clientes por Email:
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLocationNotify('Puerto Iguazú')}
                  loading={loadingNotify === 'Puerto Iguazú'}
                  disabled={submitting || (loadingNotify !== null && loadingNotify !== 'Puerto Iguazú')}
                  className="flex items-center gap-1.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Avisar en Puerto Iguazú
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLocationNotify('Posadas')}
                  loading={loadingNotify === 'Posadas'}
                  disabled={submitting || (loadingNotify !== null && loadingNotify !== 'Posadas')}
                  className="flex items-center gap-1.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Avisar en Posadas
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Mensaje Informativo (Cartel de Aviso)
              </label>
              <textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Escribí un aviso que verán los clientes al entrar a reservar..."
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <Toggle
                checked={infoMessageVisible}
                onChange={setInfoMessageVisible}
                label="Mostrar mensaje informativo en la página de reservas"
              />
            </div>
          </Card>

          {/* Barber Contact Card */}
          <Card padding="md" className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Contacto del Barbero
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Email del Barbero"
                type="email"
                value={barberEmail}
                onChange={(e) => setBarberEmail(e.target.value)}
                placeholder="contacto@barbero.com"
              />
              <Input
                label="Teléfono / WhatsApp (ej: 5493757123456)"
                value={barberPhone}
                onChange={(e) => setBarberPhone(e.target.value)}
                placeholder="5493757123456"
              />
              <Input
                label="Instagram (ej: @barbero)"
                value={barberInstagram}
                onChange={(e) => setBarberInstagram(e.target.value)}
                placeholder="@gabygord"
              />
            </div>
          </Card>

          {/* Booking Rules Card */}
          <Card padding="md" className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Reglas de Reserva y Recordatorios
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Límite para reprogramar/cancelar (horas antes)"
                type="number"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                required
                min="0"
              />
              <Input
                label="Días permitidos para reservar por adelantado"
                type="number"
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
                required
                min="1"
              />
              <Input
                label="Horas de recordatorio previas"
                type="number"
                value={reminderHours}
                onChange={(e) => setReminderHours(e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <Toggle
                checked={allowSameDayBooking}
                onChange={setAllowSameDayBooking}
                label="Permitir reservar turnos para el mismo día actual (solo horarios futuros)"
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" variant="primary" loading={submitting} size="lg">
              Guardar Configuraciones
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
