'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { EmailCampaign, CampaignSegment } from '@/lib/types'
import Swal from 'sweetalert2'

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [segmentType, setSegmentType] = useState<CampaignSegment>('all')
  const [segmentValue, setSegmentValue] = useState('3') // Default to 3 months
  const [sending, setSending] = useState(false)

  // Preview & view modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)

  const { toast } = useToast()

  const fetchCampaigns = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns')
      if (!res.ok) throw new Error('Error al cargar campañas')
      const data = await res.json()
      setCampaigns(data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron obtener las campañas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !content.trim()) {
      toast('Asunto y contenido son obligatorios.', 'error')
      return
    }

    const result = await Swal.fire({
      title: '¿Enviar campaña?',
      text: '¿Estás seguro de que querés enviar esta campaña a los clientes del segmento seleccionado?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C8A960',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Sí, enviar campaña',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    })

    if (!result.isConfirmed) return

    setSending(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          content,
          segment_type: segmentType,
          segment_value: segmentType === 'active_last_months' ? parseInt(segmentValue, 10) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar la campaña')
      }

      toast(data.message || 'Campaña enviada exitosamente.', 'success')
      
      // Reset form
      setSubject('')
      setContent('')
      setSegmentType('all')
      setSegmentValue('3')
      
      // Refresh campaign list
      fetchCampaigns()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error inesperado al enviar campaña.', 'error')
    } finally {
      setSending(false)
    }
  }

  const getSegmentLabel = (type: CampaignSegment, value: number | null) => {
    switch (type) {
      case 'all':
        return 'Todos los clientes'
      case 'with_appointments':
        return 'Clientes con turnos'
      case 'active_last_months':
        return `Activos últimos ${value ?? 3} meses`
      default:
        return type
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'sent':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400'
      case 'sending':
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400'
      case 'failed':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800/40 dark:bg-gray-800/20 dark:text-gray-400'
    }
  }

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-emerald-500'
      case 'sending':
        return 'bg-amber-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviada'
      case 'sending':
        return 'Enviando...'
      case 'failed':
        return 'Fallida'
      case 'draft':
        return 'Borrador'
      default:
        return status
    }
  }



  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Campañas de Email
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Diseñá y enviá correos informativos o promocionales a tus segmentos de clientes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Side: Create Campaign Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] mb-4">
              Nueva Campaña
            </h3>

            <form onSubmit={handleSendCampaign} className="space-y-4">
              <Input
                label="Asunto del Correo"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Ej: ¡Promociones especiales esta semana!"
                disabled={sending}
              />

              {/* Segment Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Segmento de Destinatarios
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition-all duration-200 ${
                    segmentType === 'all'
                      ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)]/5 text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)]'
                  }`}>
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="segmentType"
                        value="all"
                        checked={segmentType === 'all'}
                        onChange={() => setSegmentType('all')}
                        className="h-4 w-4 text-[var(--gold-primary)] focus:ring-[var(--gold-primary)]"
                        disabled={sending}
                      />
                      Todos
                    </span>
                  </label>

                  <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition-all duration-200 ${
                    segmentType === 'with_appointments'
                      ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)]/5 text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)]'
                  }`}>
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="segmentType"
                        value="with_appointments"
                        checked={segmentType === 'with_appointments'}
                        onChange={() => setSegmentType('with_appointments')}
                        className="h-4 w-4 text-[var(--gold-primary)] focus:ring-[var(--gold-primary)]"
                        disabled={sending}
                      />
                      Con Turnos
                    </span>
                  </label>

                  <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition-all duration-200 ${
                    segmentType === 'active_last_months'
                      ? 'border-[var(--gold-primary)] bg-[var(--gold-primary)]/5 text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--gold-primary)]'
                  }`}>
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="segmentType"
                        value="active_last_months"
                        checked={segmentType === 'active_last_months'}
                        onChange={() => setSegmentType('active_last_months')}
                        className="h-4 w-4 text-[var(--gold-primary)] focus:ring-[var(--gold-primary)]"
                        disabled={sending}
                      />
                      Activos Recientes
                    </span>
                  </label>
                </div>
              </div>

              {/* Segment Value conditional field */}
              {segmentType === 'active_last_months' && (
                <div className="animate-[slide-up_0.2s_ease-out]">
                  <Input
                    label="Meses desde la última cita"
                    type="number"
                    value={segmentValue}
                    onChange={(e) => setSegmentValue(e.target.value)}
                    required
                    min="1"
                    max="12"
                    placeholder="3"
                    disabled={sending}
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Se enviará a clientes con citas creadas en los últimos {segmentValue} meses.
                  </p>
                </div>
              )}

              {/* Content text area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Mensaje de la Campaña (Texto Plano)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribí tu mensaje acá... Se enviará usando la plantilla institucional de GabyGor (con un botón automático para reservar turnos)."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                  rows={8}
                  required
                  disabled={sending}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={sending || !content.trim()}
                >
                  Previsualizar
                </Button>
                <Button type="submit" variant="primary" loading={sending} disabled={sending}>
                  Enviar Campaña
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: Quick Preview Simulator */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block">
          <Card className="p-6 h-full flex flex-col">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] mb-4">
              Previsualización en Vivo
            </h3>
            
            {content.trim() ? (
              <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white text-black flex-1 flex flex-col max-h-[440px]">
                <div className="bg-[#111] py-4 text-center border-b">
                  <h4 className="text-[var(--gold-primary)] font-heading text-base font-bold m-0">GabyGor</h4>
                </div>
                <div className="p-6 overflow-y-auto text-sm text-gray-800 flex-1 flex flex-col">
                  <div style={{ whiteSpace: 'pre-line' }} className="leading-relaxed mb-6">
                    {content}
                  </div>
                  <div className="text-center my-4">
                    <span className="inline-block px-6 py-2.5 bg-[#C8A960] text-black font-semibold rounded text-sm select-none">
                      Reservar un Turno
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-auto pt-4 border-t">
                    Hacé click en el botón de arriba para ver los horarios disponibles y agendar tu próxima cita.
                  </p>
                </div>
                <div className="bg-gray-100 py-3 text-center border-t text-[10px] text-gray-400">
                  GabyGor
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl flex-1 flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--text-secondary)]">
                <svg className="h-12 w-12 text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Escribí contenido para ver la previsualización del correo electrónico.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom Part: Campaign History */}
      <Card className="p-6">
        <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] mb-4">
          Historial de Campañas
        </h3>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchCampaigns}>
              Reintentar
            </Button>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No se han enviado campañas de correo todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                  <th className="py-3 px-4 font-semibold">Asunto</th>
                  <th className="py-3 px-4 font-semibold">Segmento</th>
                  <th className="py-3 px-4 font-semibold">Destinatarios</th>
                  <th className="py-3 px-4 font-semibold">Fecha de envío</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{camp.subject}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {getSegmentLabel(camp.segment_type, camp.segment_value)}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] font-medium">
                      {camp.recipients_count} {camp.recipients_count === 1 ? 'cliente' : 'clientes'}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {camp.sent_at ? formatDate(camp.sent_at) : 'No enviado'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusClass(camp.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(camp.status)}`} aria-hidden="true" />
                        {getStatusLabel(camp.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedCampaign(camp)}
                      >
                        Ver Contenido
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Mobile Live Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Previsualización de Email"
      >
        <div className="space-y-4">
          <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white text-black max-h-[450px] overflow-y-auto flex flex-col">
            <div className="bg-[#111] py-4 text-center border-b">
              <h4 className="text-[var(--gold-primary)] font-heading text-base font-bold m-0">GabyGor</h4>
            </div>
            <div className="p-6 text-sm text-gray-800 flex flex-col">
              <div style={{ whiteSpace: 'pre-line' }} className="leading-relaxed mb-6">
                {content}
              </div>
              <div className="text-center my-4">
                <span className="inline-block px-6 py-2.5 bg-[#C8A960] text-black font-semibold rounded text-sm select-none">
                  Reservar un Turno
                </span>
              </div>
              <p className="text-xs text-gray-400 text-center mt-6 pt-4 border-t">
                Hacé click en el botón de arriba para ver los horarios disponibles y agendar tu próxima cita.
              </p>
            </div>
            <div className="bg-gray-100 py-3 text-center border-t text-[10px] text-gray-400">
              GabyGor
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Cerrar Previa
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: View Sent Campaign Details Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          title={`Detalle de Campaña: ${selectedCampaign.subject}`}
        >
          <div className="space-y-4">
            {/* Info header */}
            <div className="grid grid-cols-2 gap-4 text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)] pb-3">
              <div>
                <span className="block font-medium">Segmento:</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {getSegmentLabel(selectedCampaign.segment_type, selectedCampaign.segment_value)}
                </span>
              </div>
              <div>
                <span className="block font-medium">Destinatarios:</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {selectedCampaign.recipients_count} clientes
                </span>
              </div>
              <div>
                <span className="block font-medium">Fecha:</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {selectedCampaign.sent_at ? formatDate(selectedCampaign.sent_at) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block font-medium">Estado:</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusClass(selectedCampaign.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(selectedCampaign.status)}`} aria-hidden="true" />
                    {getStatusLabel(selectedCampaign.status)}
                  </span>
                </span>
              </div>
            </div>

            {/* Simulated email container */}
            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white text-black max-h-[450px] overflow-y-auto flex flex-col">
              <div className="bg-[#111] py-4 text-center border-b">
                <h4 className="text-[var(--gold-primary)] font-heading text-base font-bold m-0">GabyGor</h4>
              </div>
              <div className="p-6 text-sm text-gray-800 flex flex-col">
                <div style={{ whiteSpace: 'pre-line' }} className="leading-relaxed mb-6">
                  {selectedCampaign.content}
                </div>
                <div className="text-center my-4">
                  <span className="inline-block px-6 py-2.5 bg-[#C8A960] text-black font-semibold rounded text-sm select-none">
                    Reservar un Turno
                  </span>
                </div>
                <p className="text-xs text-gray-400 text-center mt-6 pt-4 border-t">
                  Hacé click en el botón de arriba para ver los horarios disponibles y agendar tu próxima cita.
                </p>
              </div>
              <div className="bg-gray-100 py-3 text-center border-t text-[10px] text-gray-400">
                GabyGor
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedCampaign(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
