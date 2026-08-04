'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPrice } from '@/lib/utils'
import type { Service } from '@/lib/types'

// --- Props ---

interface ServiceSelectorProps {
  selectedServices: Service[]
  onSelectServices: (services: Service[]) => void
  onContinue: () => void
}

/**
 * Paso 1 — Selección de servicio (Múltiples).
 * Muestra los servicios disponibles como tarjetas interactivas.
 * Permite seleccionar varios servicios compatibles entre sí.
 */
export function ServiceSelector({
  selectedServices,
  onSelectServices,
  onContinue,
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar servicios al montar el componente
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services')
        if (!res.ok) throw new Error('Error al cargar servicios')
        const data = await res.json()
        setServices(data)
      } catch {
        setError('No se pudieron cargar los servicios. Intentá de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const anchorService = selectedServices[0] || null

  const handleSelectService = (service: Service) => {
    const isAlreadySelected = selectedServices.some((s) => s.id === service.id)

    if (isAlreadySelected) {
      // Si se deselecciona, remover de la lista
      const updated = selectedServices.filter((s) => s.id !== service.id)
      onSelectServices(updated)
    } else {
      if (!anchorService) {
        // Primer servicio seleccionado (anchor)
        onSelectServices([service])
      } else {
        // Verificar si es compatible con el primer servicio seleccionado
        const isCompatible = anchorService.compatible_services?.includes(service.id)
        if (isCompatible) {
          onSelectServices([...selectedServices, service])
        } else {
          // Si no es compatible, deseleccionar los anteriores y seleccionar solo el nuevo
          onSelectServices([service])
        }
      }
    }
  }

  // Calcular totales
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0)

  // --- Estado de carga: Skeleton cards ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
            Elegí tu servicio
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Seleccioná el servicio que querés reservar
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-2/3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // --- Estado de error ---
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-[var(--text-secondary)]">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    )
  }

  // --- Sin servicios ---
  if (services.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--text-secondary)]">
          No hay servicios disponibles en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-sm:pb-24">
      {/* Título de sección */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
          Elegí tus servicios
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Podés combinar múltiples servicios compatibles en tu reserva.
        </p>
      </div>

      {/* Grilla de servicios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedServices.some((s) => s.id === service.id)
          
          return (
            <Card
              key={service.id}
              interactive={true}
              selected={isSelected}
              onClick={() => {
                handleSelectService(service)
              }}
              className={`
                relative transition-all duration-200
                ${isSelected
                  ? 'border-[var(--gold-primary)] ring-2 ring-[var(--gold-primary)]/30 shadow-lg shadow-[var(--gold-primary)]/10 cursor-pointer'
                  : 'hover:border-[var(--gold-primary)]/50 hover:shadow-md cursor-pointer'
                }
              `}
            >
              <div className="p-5">
                {/* Nombre del servicio */}
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--text-primary)]">
                  {service.name}
                </h3>

                {/* Descripción */}
                {service.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {service.description}
                  </p>
                )}

                {/* Precio y duración */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-[var(--gold-primary)]">
                    {formatPrice(service.price)}
                  </span>
                  {service.duration_minutes && (
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                      {service.duration_minutes} min
                    </span>
                  )}
                </div>

                {/* Indicador de selección */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold-primary)]">
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Resumen del carro / selección */}
      {selectedServices.length > 0 && (
        <div className="animate-slide-up rounded-xl border border-[var(--gold-primary)]/30 bg-[var(--gold-50)]/30 dark:bg-[var(--gold-900)]/10 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-primary)]">
                Resumen de Selección ({selectedServices.length})
              </p>
              <h4 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {selectedServices.map((s) => s.name).join(' + ')}
              </h4>
            </div>
            <div className="flex gap-4 text-sm sm:text-right sm:flex-col sm:gap-0">
              <p className="text-[var(--text-secondary)]">
                Duración: <strong className="text-[var(--text-primary)]">{totalDuration} min</strong>
              </p>
              <p className="text-[var(--text-secondary)]">
                Total: <strong className="text-[var(--gold-primary)] text-base">{formatPrice(totalPrice)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón continuar */}
      <div className="flex justify-end pt-2 max-sm:sticky max-sm:bottom-0 max-sm:-mx-6 max-sm:-mb-6 max-sm:w-[calc(100%+3rem)] max-sm:rounded-b-2xl max-sm:z-40 max-sm:bg-[var(--bg-primary)] max-sm:border-t max-sm:border-[var(--border-color)] max-sm:p-4 max-sm:shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button
          variant="primary"
          size="lg"
          disabled={selectedServices.length === 0}
          onClick={onContinue}
          className="max-sm:w-full"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
