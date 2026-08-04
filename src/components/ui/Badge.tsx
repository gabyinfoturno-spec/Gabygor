// ── Badge de estado para turnos ──────────────────

// Tipos de estado de turno (coinciden con el enum de la DB)
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show'

export interface BadgeProps {
  status: AppointmentStatus
  className?: string
}

// ── Configuración visual por estado ──────────────
const statusConfig: Record<
  AppointmentStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  pending: {
    label: 'Pendiente',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmado',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
  },
  completed: {
    label: 'Completado',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelado',
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
  },
  rescheduled: {
    label: 'Reprogramado',
    dot: 'bg-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
  },
  no_show: {
    label: 'No asistió',
    dot: 'bg-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-400',
  },
}

// ── Componente ───────────────────────────────────
export function Badge({ status, className = '' }: BadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className,
      ].join(' ')}
    >
      {/* Dot indicator */}
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}
