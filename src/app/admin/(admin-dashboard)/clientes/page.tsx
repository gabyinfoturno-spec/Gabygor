'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice } from '@/lib/utils'
import type { ClientWithCount } from '@/lib/types'

interface ClientAppointmentHistory {
  id: string
  appointment_date: string
  start_time: string
  status: string
  service?: {
    name: string
    price: number
  }
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Selected client for detail modal
  const [selectedClient, setSelectedClient] = useState<ClientWithCount | null>(null)
  const [clientHistory, setClientHistory] = useState<ClientAppointmentHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Email modal state
  const [mailRecipient, setMailRecipient] = useState<ClientWithCount | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [isMailModalOpen, setIsMailModalOpen] = useState(false)

  const { toast } = useToast()

  const fetchClients = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/clients')
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setClients(data)
    } catch (err) {
      console.error(err)
      setError('No se pudo obtener la base de datos de clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Fetch individual client history when row is clicked
  const handleViewDetails = async (client: ClientWithCount) => {
    setSelectedClient(client)
    setLoadingHistory(true)
    setClientHistory([])
    
    try {
      const res = await fetch(`/api/clients/${client.access_token}/appointments`)
      if (!res.ok) throw new Error('Error al cargar historial')
      const data = await res.json()
      setClientHistory(data)
    } catch (err) {
      console.error(err)
      toast('No se pudo cargar el historial de turnos.', 'error')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleCopyLink = (token: string) => {
    const appUrl = window.location.origin
    const url = `${appUrl}/mis-turnos/${token}`
    navigator.clipboard.writeText(url)
    toast('Enlace copiado al portapapeles.', 'success')
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mailRecipient || !emailSubject.trim() || !emailContent.trim()) {
      toast('Asunto y mensaje son obligatorios.', 'error')
      return
    }

    setSendingEmail(true)
    try {
      const res = await fetch('/api/admin/clients/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: mailRecipient.id,
          subject: emailSubject,
          content: emailContent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el correo')
      }

      toast('Correo enviado exitosamente.', 'success')
      setIsMailModalOpen(false)
      setEmailSubject('')
      setEmailContent('')
      setMailRecipient(null)
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al enviar el correo.', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  // Filter clients locally by search query
  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Clientes
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Consultá el historial de visitas de tus clientes y compartí sus enlaces de acceso
        </p>
      </div>

      {/* Search Bar */}
      <Card padding="md">
        <Input
          label="Buscar Cliente"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Escribí el nombre o correo del cliente..."
        />
      </Card>

      {/* Table */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchClients}>
            Reintentar
          </Button>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card className="py-12 text-center text-sm text-[var(--text-secondary)]">
          {searchQuery ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes registrados.'}
        </Card>
      ) : (
        <Card padding="none" className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-gray-50/50 dark:bg-gray-900/10 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="p-4">Nombre</th>
                <th className="p-4">Email</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4">Registrado</th>
                <th className="p-4 text-center">Turnos</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-[var(--bg-secondary)]/30 transition-colors"
                >
                  <td className="p-4 font-bold text-[var(--text-primary)]">
                    {client.full_name}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)]">{client.email}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{client.phone || '—'}</td>
                  <td className="p-4 text-[var(--text-secondary)]">
                    {formatDate(client.created_at)}
                  </td>
                  <td className="p-4 text-center font-semibold text-[var(--gold-primary)]">
                    {client.appointment_count}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyLink(client.access_token)}>
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMailRecipient(client)
                        setIsMailModalOpen(true)
                      }}
                    >
                      Enviar Email
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleViewDetails(client)}>
                      Ver Ficha
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`Ficha de Cliente: ${selectedClient.full_name}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p>
                  <strong className="text-[var(--text-secondary)] uppercase text-xs tracking-wider">Email:</strong>{' '}
                  <span className="text-[var(--text-primary)]">{selectedClient.email}</span>
                </p>
                <p>
                  <strong className="text-[var(--text-secondary)] uppercase text-xs tracking-wider">Teléfono:</strong>{' '}
                  <span className="text-[var(--text-primary)]">{selectedClient.phone || '—'}</span>
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto"
                    onClick={() => {
                      setMailRecipient(selectedClient)
                      setIsMailModalOpen(true)
                    }}
                  >
                    Enviar Email
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/5 p-3 text-xs">
                <p className="font-semibold text-[var(--text-primary)]">Link de Auto-gestión</p>
                <p className="text-[var(--text-secondary)]">El cliente puede usar este link para ver, reprogramar o cancelar sus turnos sin loguearse.</p>
                <div className="mt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCopyLink(selectedClient.access_token)}
                  >
                    Copiar Enlace Privado
                  </Button>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3">
              <h4 className="font-heading text-base font-bold text-[var(--text-primary)]">
                Historial de Turnos
              </h4>
              {loadingHistory ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : clientHistory.length === 0 ? (
                <p className="text-center text-xs text-[var(--text-secondary)] py-4">
                  Este cliente aún no tiene turnos registrados.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
                  {clientHistory.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-[var(--bg-secondary)]/20"
                    >
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">
                          {app.service?.name || 'Servicio'}
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          {formatDate(app.appointment_date)} a las {app.start_time.slice(0, 5)} hs
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatPrice(app.service?.price || 0)}
                        </span>
                        <span className="capitalize">{app.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedClient(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Send Email Modal */}
      {isMailModalOpen && mailRecipient && (
        <Modal
          isOpen={isMailModalOpen}
          onClose={() => {
            setIsMailModalOpen(false)
            setMailRecipient(null)
            setEmailSubject('')
            setEmailContent('')
          }}
          title={`Enviar Correo a ${mailRecipient.full_name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSendEmail} className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Destinatario: <strong className="text-[var(--text-primary)]">{mailRecipient.full_name} ({mailRecipient.email})</strong>
            </p>

            <Input
              label="Asunto del Correo"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              required
              placeholder="Ej: Recordatorio de tu consulta / Reprogramación especial"
              disabled={sendingEmail}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Mensaje (Texto Plano)
              </label>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Escribí el contenido de tu correo acá... Se enviará dentro de la plantilla oficial de GabyGor."
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                rows={6}
                required
                disabled={sendingEmail}
              />
            </div>

            {/* Email Live Preview Simulator */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Previsualización
              </label>
              <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-white text-black max-h-[300px] overflow-y-auto flex flex-col">
                <div className="bg-[#111] py-3 text-center border-b">
                  <h4 className="text-[var(--gold-primary)] font-heading text-sm font-bold m-0">GabyGor</h4>
                </div>
                <div className="p-5 text-sm text-gray-800 flex flex-col">
                  <h5 className="text-base text-gray-900 font-bold m-0 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                    Hola {mailRecipient.full_name},
                  </h5>
                  <div style={{ whiteSpace: 'pre-line' }} className="leading-relaxed mb-4">
                    {emailContent || '(Escribí tu mensaje para verlo acá...)'}
                  </div>
                  <div className="text-center my-2">
                    <span className="inline-block px-5 py-2 bg-[#C8A960] text-black font-semibold rounded text-xs select-none">
                      Visitar nuestra Web
                    </span>
                  </div>
                </div>
                <div className="bg-gray-100 py-2 text-center border-t text-[10px] text-gray-400">
                  GabyGor
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsMailModalOpen(false)
                  setMailRecipient(null)
                  setEmailSubject('')
                  setEmailContent('')
                }}
                disabled={sendingEmail}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={sendingEmail} disabled={sendingEmail}>
                Enviar Email
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
