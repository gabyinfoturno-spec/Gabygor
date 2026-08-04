'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Service } from '@/lib/types'

// --- Tipos del flujo de reserva ---

/** Paso actual del flujo: 1=Servicio, 2=Fecha/Hora, 3=Datos cliente, 'confirmed'=Éxito */
export type BookingStep = 1 | 2 | 3 | 'confirmed'

/** Estado completo del flujo de reserva */
export interface BookingState {
  step: BookingStep
  selectedServices: Service[] // Soporte para múltiples servicios
  selectedDate: string | null // Formato YYYY-MM-DD
  selectedSlot: { start: string; end: string } | null
  clientName: string
  clientEmail: string
}

/** Datos de la reserva confirmada */
export interface ConfirmedBooking {
  appointmentId: string
  accessToken: string
}

/** Valor de retorno del hook */
export interface UseBookingReturn {
  state: BookingState
  confirmedBooking: ConfirmedBooking | null
  setSelectedServices: (services: Service[]) => void
  setSelectedDate: (date: string | null) => void
  setSelectedSlot: (slot: { start: string; end: string } | null) => void
  setClientName: (name: string) => void
  setClientEmail: (email: string) => void
  setConfirmedBooking: (booking: ConfirmedBooking) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
  canProceed: boolean
}

// --- Estado inicial ---
const initialState: BookingState = {
  step: 1,
  selectedServices: [],
  selectedDate: null,
  selectedSlot: null,
  clientName: '',
  clientEmail: '',
}

/**
 * Hook personalizado para gestionar el flujo de reserva de turnos.
 * Maneja el estado de los 3 pasos + pantalla de confirmación.
 */
export function useBooking(): UseBookingReturn {
  const [state, setState] = useState<BookingState>(initialState)
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null)
  const isRehydrated = useRef(false)

  // 1. Rehidratar estado de localStorage al montar (para restaurar flujo tras redirección de OAuth)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('gabygor_booking_state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.step !== 'confirmed') {
          setState({
            selectedServices: parsed.selectedServices || [],
            selectedDate: parsed.selectedDate || null,
            selectedSlot: parsed.selectedSlot || null,
            clientName: parsed.clientName || '',
            clientEmail: parsed.clientEmail || '',
            step: parsed.step || 1,
          })
        }
      } catch (err) {
        console.error('[useBooking] Error rehydrating state:', err)
      }
    }
    isRehydrated.current = true
  }, [])

  // 2. Guardar estado en localStorage continuamente tras rehidratación
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isRehydrated.current) return

    if (state.step === 'confirmed') {
      localStorage.removeItem('gabygor_booking_state')
    } else {
      localStorage.setItem('gabygor_booking_state', JSON.stringify(state))
    }
  }, [state])

  // --- Setters individuales ---

  const setSelectedServices = useCallback((services: Service[]) => {
    setState((prev) => ({
      ...prev,
      selectedServices: services,
      // Al cambiar servicios, resetear fecha y horario (dependen del servicio)
      selectedDate: null,
      selectedSlot: null,
    }))
  }, [])

  const setSelectedDate = useCallback((date: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      // Al cambiar fecha, resetear horario
      selectedSlot: null,
    }))
  }, [])

  const setSelectedSlot = useCallback((slot: { start: string; end: string } | null) => {
    setState((prev) => ({ ...prev, selectedSlot: slot }))
  }, [])

  const setClientName = useCallback((clientName: string) => {
    setState((prev) => ({ ...prev, clientName }))
  }, [])

  const setClientEmail = useCallback((clientEmail: string) => {
    setState((prev) => ({ ...prev, clientEmail }))
  }, [])

  // --- Navegación entre pasos ---

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 1) return { ...prev, step: 2 }
      if (prev.step === 2) return { ...prev, step: 3 }
      if (prev.step === 3) return { ...prev, step: 'confirmed' }
      return prev
    })
  }, [])

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 3) return { ...prev, step: 2 }
      if (prev.step === 2) return { ...prev, step: 1 }
      return prev
    })
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
    setConfirmedBooking(null)
  }, [])

  // --- Validación: ¿puede avanzar al siguiente paso? ---

  const canProceed = (() => {
    switch (state.step) {
      case 1:
        return state.selectedServices.length > 0
      case 2:
        return state.selectedDate !== null && state.selectedSlot !== null
      case 3:
        return (
          state.clientName.trim().length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.clientEmail)
        )
      default:
        return false
    }
  })()

  return {
    state,
    confirmedBooking,
    setSelectedServices,
    setSelectedDate,
    setSelectedSlot,
    setClientName,
    setClientEmail,
    setConfirmedBooking,
    nextStep,
    prevStep,
    reset,
    canProceed,
  }
}
