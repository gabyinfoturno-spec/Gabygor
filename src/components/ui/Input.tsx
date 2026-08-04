'use client'

import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useId,
} from 'react'

// ── Tipos ────────────────────────────────────────
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  /** Ícono a la izquierda del campo */
  icon?: ReactNode
}

// ── Componente ───────────────────────────────────
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id: idProp, ...rest }, ref) => {
    const autoId = useId()
    const inputId = idProp ?? autoId
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {icon && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={[
              'w-full rounded-xl border bg-[var(--bg-primary)] px-4 py-2.5 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',

              // Borde normal vs error
              error
                ? 'border-red-500 focus:ring-red-500/30'
                : 'border-[var(--border-color)] focus:border-[var(--gold-primary)] focus:ring-[var(--gold-primary)]/30',

              // Padding extra si hay ícono
              icon ? 'pl-10' : '',

              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} className="text-xs text-red-500 mt-0.5" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input }
