'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentResultContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const appointmentId = searchParams.get('appointment_id')

  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const [accessUrl, setAccessUrl] = useState<string | null>(null)

  // Confirmar el pago en tiempo real con la API de MP si viene el payment_id
  useEffect(() => {
    if (!paymentId) return
    fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    })
      .then((r) => r.json())
      .catch((err) => console.error('[pago/resultado] Confirm error:', err))
  }, [paymentId])

  // Recuperar el access_token para el link de "Ver mis turnos"
  useEffect(() => {
    if (!appointmentId) return
    fetch(`/api/payments/appointment-access?appointmentId=${appointmentId}`)
      .then((r) => r.json())
      .then((d) => { if (d.accessUrl) setAccessUrl(d.accessUrl) })
      .catch(() => {})
  }, [appointmentId])

  const isApproved = status === 'approved'
  const isPending = status === 'pending'
  const isFailure = !isApproved && !isPending

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-8 shadow-lg text-center space-y-6">

        {/* Ícono principal */}
        <div className="flex justify-center">
          {isApproved && (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isPending && (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          {isFailure && (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Título y descripción */}
        {isApproved && (
          <>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
                ¡Pago confirmado!
              </h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                Tu pago fue acreditado con éxito. Tu turno está reservado y pagado.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-300 text-left">
              <svg className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Te enviamos un email de confirmación con el comprobante del pago.</span>
            </div>
          </>
        )}

        {isPending && (
          <>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
                Pago en proceso
              </h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                Tu pago está siendo procesado por Mercado Pago. Te notificaremos cuando se acredite.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300 text-left">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Esto puede tardar unos minutos o hasta 2 días hábiles dependiendo de tu medio de pago.</span>
            </div>
          </>
        )}

        {isFailure && (
          <>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
                Pago no procesado
              </h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                No pudimos procesar tu pago. Tu turno sigue reservado — podés pagar en el momento o intentarlo nuevamente.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-300 text-left">
              <svg className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>El pago fue rechazado o cancelado. Podés intentar con otro medio de pago.</span>
            </div>
          </>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3 pt-2">
          {accessUrl ? (
            <Link
              href={accessUrl}
              className="block w-full rounded-xl bg-[var(--gold-primary)] px-6 py-3.5 text-center text-sm font-bold text-[var(--bg-primary)] transition-opacity hover:opacity-90"
            >
              Ver mis turnos
            </Link>
          ) : (
            <Link
              href="/"
              className="block w-full rounded-xl bg-[var(--gold-primary)] px-6 py-3.5 text-center text-sm font-bold text-[var(--bg-primary)] transition-opacity hover:opacity-90"
            >
              Volver al inicio
            </Link>
          )}

          {isFailure && (
            <Link
              href="/"
              className="block w-full rounded-xl border border-[var(--border-color)] px-6 py-3.5 text-center text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Reservar otro turno
            </Link>
          )}
        </div>

        {/* Branding MP */}
        <p className="text-xs text-[var(--text-muted)]">
          Procesado por{' '}
          <span className="font-semibold text-[#009EE3]">Mercado Pago</span>
        </p>
      </div>
    </div>
  )
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="h-10 w-10 rounded-full border-4 border-t-[var(--gold-primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  )
}
