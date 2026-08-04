// ── Stepper de pasos de reserva ──────────────────

export interface StepperProps {
  /** Paso actual (0-indexed) */
  currentStep: number
  className?: string
}

// Pasos de la reserva
const STEPS = [
  { label: 'Servicio', shortLabel: 'Servicio' },
  { label: 'Fecha y Hora', shortLabel: 'Fecha' },
  { label: 'Confirmar', shortLabel: 'Confirmar' },
] as const

// ── Check icon SVG ───────────────────────────────
function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5l3 3 5-6" />
    </svg>
  )
}

// ── Componente ───────────────────────────────────
export function Stepper({ currentStep, className = '' }: StepperProps) {
  return (
    <nav aria-label="Progreso de reserva" className={className}>
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li
              key={step.label}
              className="flex flex-1 items-center"
            >
              {/* Paso */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                {/* Círculo del paso */}
                <div className="flex items-center w-full">
                  {/* Línea izquierda (no en el primero) */}
                  {index > 0 && (
                    <div className="flex-1 h-0.5 mr-2">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          isCompleted || isCurrent
                            ? 'bg-[var(--gold-primary)]'
                            : 'bg-[var(--border-color)]',
                        ].join(' ')}
                      />
                    </div>
                  )}

                  {/* Indicador circular */}
                  <div
                    className={[
                      'flex items-center justify-center shrink-0 transition-all duration-300',
                      'h-8 w-8 rounded-full text-xs font-semibold',
                      isCompleted
                        ? 'bg-[var(--gold-primary)] text-white'
                        : isCurrent
                        ? 'bg-[var(--gold-primary)] text-white shadow-[var(--shadow-gold)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border-color)]',
                    ].join(' ')}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? <CheckIcon /> : index + 1}
                  </div>

                  {/* Línea derecha (no en el último) */}
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 ml-2">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          isCompleted
                            ? 'bg-[var(--gold-primary)]'
                            : 'bg-[var(--border-color)]',
                        ].join(' ')}
                      />
                    </div>
                  )}
                </div>

                {/* Label */}
                <span
                  className={[
                    'text-xs font-medium transition-colors duration-200 text-center',
                    isCurrent
                      ? 'text-[var(--gold-primary)]'
                      : isCompleted
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)]',
                  ].join(' ')}
                >
                  {/* Mostrar label corto en mobile, completo en desktop */}
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
