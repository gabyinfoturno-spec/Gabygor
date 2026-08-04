'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calendar } from '@/components/ui/Calendar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { BlockedDate, BlockType } from '@/lib/types'
import Swal from 'sweetalert2'

export default function AdminBlockedDatesPage() {
  const [blocks, setBlocks] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [blockType, setBlockType] = useState<'vacation' | 'holiday' | 'personal' | 'other'>('personal')

  const { toast } = useToast()

  const fetchBlocks = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/blocked-dates')
      if (!res.ok) throw new Error('Error al cargar fechas bloqueadas')
      const data = await res.json()
      setBlocks(data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron obtener las fechas bloqueadas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlocks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocked_date: startDate,
          end_date: endDate || null,
          reason,
          block_type: blockType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al bloquear la fecha')
      }

      toast('Fecha bloqueada correctamente.', 'success')
      // Reset form
      setStartDate('')
      setEndDate('')
      setReason('')
      setBlockType('personal')
      fetchBlocks()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al bloquear la fecha.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Desbloquear fecha?',
      text: '¿Estás seguro de que querés desbloquear esta fecha?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C8A960',
      cancelButtonColor: '#1a1a1a',
      confirmButtonText: 'Sí, desbloquear',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/blocked-dates/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar bloqueo')
      }

      toast('Fecha desbloqueada correctamente.', 'success')
      fetchBlocks()
    } catch (err: unknown) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Error al eliminar bloqueo.', 'error')
    }
  }

  // Generate date list array for calendar highlights
  const blockedDatesStrings: string[] = []
  blocks.forEach((block) => {
    if (!block.end_date) {
      blockedDatesStrings.push(block.blocked_date)
    } else {
      // Loop from start date to end date
      const start = new Date(block.blocked_date + 'T12:00:00')
      const end = new Date(block.end_date + 'T12:00:00')
      const current = new Date(start)
      while (current <= end) {
        const y = current.getFullYear()
        const m = String(current.getMonth() + 1).padStart(2, '0')
        const d = String(current.getDate()).padStart(2, '0')
        blockedDatesStrings.push(`${y}-${m}-${d}`)
        current.setDate(current.getDate() + 1)
      }
    }
  })

  const blockTypeLabels = {
    vacation: 'Vacaciones',
    holiday: 'Feriado',
    personal: 'Asunto Personal',
    other: 'Otro',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Fechas Bloqueadas
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Bloqueá días completos para feriados, vacaciones o ausencias temporales
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left/Middle: Calendar and Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Calendar */}
            <Card padding="md">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Vista de Bloqueos
              </h3>
              <Calendar
                blockedDates={blockedDatesStrings}
                onSelectDate={(date) => setStartDate(date)}
              />
            </Card>

            {/* Block Form */}
            <Card padding="md">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Bloquear Nueva Fecha
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Fecha de Inicio"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />

                <Input
                  label="Fecha de Fin (Opcional)"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Tipo de Bloqueo
                  </label>
                  <select
                    value={blockType}
                    onChange={(e) => setBlockType(e.target.value as BlockType)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--gold-primary)] focus:outline-none"
                  >
                    <option value="personal">Asunto Personal</option>
                    <option value="vacation">Vacaciones</option>
                    <option value="holiday">Feriado</option>
                    <option value="other">Otro Motivo</option>
                  </select>
                </div>

                <Input
                  label="Motivo o Nota"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. Viaje familiar, Trámite personal"
                />

                <div className="pt-2">
                  <Button type="submit" variant="primary" fullWidth loading={submitting}>
                    Bloquear Fecha(s)
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        {/* Right: Blocked Dates List */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
            Bloqueos Registrados
          </h3>

          <Card padding="none" className="overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-500">
                <p className="mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchBlocks}>Reintentar</Button>
              </div>
            ) : blocks.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No hay fechas bloqueadas actualmente.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)] max-h-[500px] overflow-y-auto">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)]/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {formatDate(block.blocked_date)}
                        {block.end_date ? ` al ${formatDate(block.end_date)}` : ''}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {blockTypeLabels[block.block_type]} {block.reason ? `• ${block.reason}` : ''}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(block.id)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </Button>
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
