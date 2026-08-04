// ============================================================
// FUNCIONES UTILITARIAS
// Helpers reutilizables para formateo, validación y UI.
// ============================================================

import { STATUS_MAP, DAY_NAMES, DEFAULT_TIMEZONE } from './constants'
import type { AppointmentStatus } from './types'

// ------------------------------------------------------------
// Formateo de fechas
// ------------------------------------------------------------

/**
 * Formatea una fecha a formato argentino dd/mm/yyyy.
 * Acepta string ISO o Date.
 */
export function formatDate(date: string | Date): string {
  if (!date) return '—'
  let d: Date
  if (typeof date === 'string') {
    if (date.includes('T') || date.includes(' ')) {
      d = new Date(date)
    } else {
      d = new Date(date + 'T00:00:00')
    }
  } else {
    d = date
  }

  if (isNaN(d.getTime())) {
    return '—'
  }

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea un string de hora (HH:mm:ss o HH:mm) a 'HH:mm hs'.
 */
export function formatTime(time: string): string {
  const parts = time.split(':')
  return `${parts[0]}:${parts[1]} hs`
}

// ------------------------------------------------------------
// Formateo de precios
// ------------------------------------------------------------

/**
 * Formatea un precio a formato argentino: $X.XXX
 * Usa punto como separador de miles.
 */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

// ------------------------------------------------------------
// Clases CSS
// ------------------------------------------------------------

/**
 * Merge de clases CSS condicional.
 * Filtra valores falsy y une las clases con espacio.
 * Alternativa liviana a clsx/cn sin dependencias.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ')
}

// ------------------------------------------------------------
// URLs
// ------------------------------------------------------------

/**
 * Obtiene la URL base de la aplicación, forzando el dominio de producción gabygor.com.ar
 * si se está en Vercel o en entorno de producción no local.
 */
export function getAppUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = window.location.origin
  }

  if (!baseUrl) {
    baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
  }
  
  if (
    baseUrl.includes('.vercel.app') || 
    (process.env.NODE_ENV === 'production' && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1'))
  ) {
    baseUrl = 'https://gabygor.com.ar'
  }
  return baseUrl
}

/**
 * Genera la URL del portal de gestión del cliente a partir
 * de su access_token único.
 */
export function generateAccessUrl(token: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/mis-turnos/${token}`
}

/**
 * Alias de generateAccessUrl para compatibilidad con las plantillas de email.
 */
export function getClientPortalUrl(token: string): string {
  return generateAccessUrl(token)
}

// ------------------------------------------------------------
// Validación de turnos
// ------------------------------------------------------------

/**
 * Verifica si un turno puede ser modificado/cancelado
 * en base a la restricción de horas mínimas (RF-12).
 *
 * @param appointmentDate - Fecha del turno (YYYY-MM-DD)
 * @param startTime - Hora de inicio (HH:mm:ss o HH:mm)
 * @param minHours - Horas mínimas antes del turno (default: 2)
 * @returns true si el turno aún puede ser modificado
 */
export function canModifyAppointment(
  appointmentDate: string,
  startTime: string,
  minHours: number = 2
): boolean {
  // Construir datetime del turno en zona horaria de Argentina
  const appointmentDateTime = new Date(
    `${appointmentDate}T${startTime}`
  )

  const now = new Date()

  // Calcular diferencia en milisegundos y convertir a horas
  const diffMs = appointmentDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  return diffHours > minHours
}

// ------------------------------------------------------------
// Labels y colores de estados
// ------------------------------------------------------------

/**
 * Traduce un estado de turno a su etiqueta en español.
 */
export function getStatusLabel(status: string): string {
  return (
    STATUS_MAP[status as AppointmentStatus]?.label || status
  )
}

/**
 * Devuelve las clases Tailwind de color para un estado de turno.
 */
export function getStatusColor(status: string): string {
  return (
    STATUS_MAP[status as AppointmentStatus]?.color ||
    'bg-gray-100 text-gray-800'
  )
}

// ------------------------------------------------------------
// Nombres de días
// ------------------------------------------------------------

/**
 * Devuelve el nombre del día en español.
 * @param dayOfWeek - 0=Domingo, 1=Lunes, ..., 6=Sábado
 */
export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || ''
}

// ------------------------------------------------------------
// Fecha actual en zona horaria argentina
// ------------------------------------------------------------

/**
 * Devuelve la fecha actual como string ISO (YYYY-MM-DD) en
 * la zona horaria de Argentina.
 */
export function getTodayInTimezone(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
  })
}
