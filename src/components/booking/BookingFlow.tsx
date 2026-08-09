'use client'

import { useCallback, useEffect } from 'react'
import { useBooking } from '@/hooks/useBooking'
import { Stepper } from '@/components/ui/Stepper'
import { ServiceSelector } from './ServiceSelector'
import { DateTimePicker } from './DateTimePicker'
import { ClientForm } from './ClientForm'
import { BookingConfirmation } from './BookingConfirmation'
import type { ConfirmedBooking } from '@/hooks/useBooking'

export function BookingFlow() {
  const {
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
  } = useBooking()

  // Escuchar el evento de click en el logo para reiniciar el flujo
  useEffect(() => {
    const handleReset = () => {
      reset()
    }
    window.addEventListener('gabygor-reset-flow', handleReset)
    return () => {
      window.removeEventListener('gabygor-reset-flow', handleReset)
    }
  }, [reset])

  const handleConfirm = useCallback((booking: ConfirmedBooking) => {
    setConfirmedBooking(booking)
    nextStep()
  }, [setConfirmedBooking, nextStep])

  const hasSelectedServices = state.selectedServices.length > 0

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm sm:p-8">
      {/* Renders Stepper at the top only during steps 1, 2, and 3 */}
      {typeof state.step === 'number' && (
        <div className="mb-8">
          <Stepper currentStep={state.step - 1} />
        </div>
      )}

      {/* Conditionally renders steps */}
      <div className="animate-fade-in">
        {state.step === 1 && (
          <ServiceSelector
            selectedServices={state.selectedServices}
            onSelectServices={setSelectedServices}
            onContinue={nextStep}
          />
        )}

        {state.step === 2 && hasSelectedServices && (
          <DateTimePicker
            services={state.selectedServices}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            onSelectDate={setSelectedDate}
            onSelectSlot={setSelectedSlot}
            onContinue={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === 3 && hasSelectedServices && state.selectedDate && state.selectedSlot && (
          <ClientForm
            services={state.selectedServices}
            date={state.selectedDate}
            slot={state.selectedSlot}
            clientName={state.clientName}
            clientEmail={state.clientEmail}
            onChangeName={setClientName}
            onChangeEmail={setClientEmail}
            onConfirm={handleConfirm}
            onBack={prevStep}
          />
        )}

        {state.step === 'confirmed' && hasSelectedServices && state.selectedDate && state.selectedSlot && confirmedBooking && (
          <BookingConfirmation
            services={state.selectedServices}
            date={state.selectedDate}
            slot={state.selectedSlot}
            clientEmail={state.clientEmail}
            accessToken={confirmedBooking.accessToken}
            appointmentId={confirmedBooking.appointmentId}
            onReset={reset}
          />
        )}
      </div>
    </div>
  )
}
