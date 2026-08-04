'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/lib/utils'
import type { Service } from '@/lib/types'
import Swal from 'sweetalert2'

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('30')
  const [isActive, setIsActive] = useState(true)
  const [compatibleServices, setCompatibleServices] = useState<string[]>([])

  const { toast } = useToast()

  const fetchServices = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all services (both active and inactive) from database
      const res = await fetch('/api/services?all=true')
      if (!res.ok) throw new Error('Error al cargar servicios')
      const data = await res.json()
      // Sort by display_order
      setServices(data.sort((a: Service, b: Service) => a.display_order - b.display_order))
    } catch (err) {
      console.error(err)
      setError('No se pudieron obtener los servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const openNewModal = () => {
    setEditingService(null)
    setName('')
    setDescription('')
    setPrice('')
    setDuration('30')
    setIsActive(true)
    setCompatibleServices([])
    setIsModalOpen(true)
  }

  const openEditModal = (service: Service) => {
    setEditingService(service)
    setName(service.name)
    setDescription(service.description || '')
    setPrice(service.price.toString())
    setDuration(service.duration_minutes.toString())
    setIsActive(service.is_active)
    setCompatibleServices(service.compatible_services || [])
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price || !duration) return

    setSubmitting(true)
    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services'
      const method = editingService ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          duration_minutes: parseInt(duration, 10),
          is_active: isActive,
          compatible_services: compatibleServices,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar el servicio')
      }

      toast(
        editingService ? 'Servicio actualizado exitosamente.' : 'Servicio creado exitosamente.',
        'success'
      )
      setIsModalOpen(false)
      fetchServices()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Ocurrió un error inesperado.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !service.is_active,
        }),
      })

      if (!res.ok) throw new Error('Error al actualizar estado')
      toast(`Servicio ${!service.is_active ? 'activado' : 'desactivado'} correctamente.`, 'success')
      fetchServices()
    } catch (err) {
      console.error(err)
      toast('No se pudo cambiar el estado del servicio.', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar servicio?',
      text: '¿Estás seguro de que querés eliminar este servicio? No podrás deshacer esta acción.',
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

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast('Servicio eliminado exitosamente.', 'success')
      fetchServices()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al eliminar el servicio.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Servicios
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Administrá los servicios y tratamientos de la barbería
          </p>
        </div>
        <Button variant="primary" onClick={openNewModal}>
          + Nuevo Servicio
        </Button>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchServices}>
            Reintentar
          </Button>
        </Card>
      ) : services.length === 0 ? (
        <Card className="py-12 text-center text-sm text-[var(--text-secondary)]">
          No hay servicios creados aún.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className={`flex flex-col justify-between ${
                !service.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
                    {service.name}
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    service.is_active
                      ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400'
                      : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800/40 dark:bg-gray-800/20 dark:text-gray-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${service.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true" />
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {service.description || 'Sin descripción'}
                </p>
                <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                  <span>Duración: {service.duration_minutes} min</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--border-color)] pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(service)}
                >
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEditModal(service)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(service.id)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Servicio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Corte de pelo"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Descripción (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del servicio..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio ($ ARS)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              placeholder="3500"
            />

            <Input
              label="Duración (minutos)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min="5"
              placeholder="30"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[var(--gold-primary)] focus:ring-[var(--gold-primary)]"
            />
            <label htmlFor="isActiveToggle" className="text-sm font-medium text-[var(--text-primary)]">
              Servicio Activo (Visible para clientes)
            </label>
          </div>

          {/* Servicios Compatibles */}
          <div className="flex flex-col gap-1.5 border-t border-[var(--border-color)] pt-4">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Servicios Compatibles (Se pueden reservar juntos)
            </label>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Seleccioná qué otros servicios se pueden agregar en la misma cita junto con este.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-secondary)]">
              {services
                .filter((s) => !editingService || s.id !== editingService.id)
                .map((s) => {
                  const checked = compatibleServices.includes(s.id)
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer hover:text-[var(--gold-primary)] transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompatibleServices((prev) => [...prev, s.id])
                          } else {
                            setCompatibleServices((prev) => prev.filter((id) => id !== s.id))
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[var(--gold-primary)] focus:ring-[var(--gold-primary)]"
                      />
                      <span>{s.name}</span>
                    </label>
                  )
                })}
              {services.filter((s) => !editingService || s.id !== editingService.id).length === 0 && (
                <p className="col-span-2 text-xs text-[var(--text-secondary)] italic">
                  No hay otros servicios disponibles para emparejar.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Guardar Servicio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
