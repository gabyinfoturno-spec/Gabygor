// ============================================================
// CONSTANTES DE LA APLICACIÓN
// Valores globales reutilizados en toda la app.
// ============================================================

import type { AppointmentStatus, BookingStepDefinition } from './types'

// --- Identidad ---
export const APP_NAME = 'GabyGor'

// --- Zona horaria ---
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'

// --- Pasos del flujo de reserva ---
export const BOOKING_STEPS: BookingStepDefinition[] = [
  { id: 1, title: 'Servicio' },
  { id: 2, title: 'Fecha y Hora' },
  { id: 3, title: 'Confirmar' },
]

// --- Mapa de estados de turnos ---
export const STATUS_MAP: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Completado',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  rescheduled: {
    label: 'Reprogramado',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  no_show: {
    label: 'No se presentó',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  },
}

// --- Nombres de días en español (0=Domingo) ---
export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

// --- Nombres de meses en español ---
export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

// --- Configuración de reservas ---
/** Mínimo de horas antes del turno para poder modificar/cancelar (RF-12) */
export const MIN_HOURS_BEFORE_MODIFICATION = 2

/** Máximo de días hacia adelante para reservar */
export const MAX_DAYS_ADVANCE_BOOKING = 30
