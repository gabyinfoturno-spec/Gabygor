'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'

// ── Tipos ────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

// ── Estilos por variante ─────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--gold-primary)] text-white',
    'hover:brightness-110 hover:shadow-[var(--shadow-gold)]',
    'active:brightness-95',
    'disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none',
  ].join(' '),

  secondary: [
    'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
    'hover:bg-[var(--border-color)]',
    'active:bg-[var(--border-hover)]',
    'disabled:opacity-50',
  ].join(' '),

  outline: [
    'border border-[var(--gold-primary)] text-[var(--gold-primary)] bg-transparent',
    'hover:bg-[var(--gold-light)]',
    'active:bg-[var(--gold-light)]',
    'disabled:opacity-50 disabled:hover:bg-transparent',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--text-secondary)]',
    'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
    'active:bg-[var(--bg-tertiary)]',
    'disabled:opacity-50 disabled:hover:bg-transparent',
  ].join(' '),

  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'active:bg-red-800',
    'disabled:opacity-50 disabled:hover:bg-red-600',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-7 py-3.5 text-base gap-2.5 rounded-xl',
}

// ── Spinner SVG ──────────────────────────────────
function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin-slow ${className}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Componente ───────────────────────────────────
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          // Base
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 ease-out',
          'select-none cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-primary)]',
          // Variante y tamaño
          variantStyles[variant],
          sizeStyles[size],
          // Opciones
          fullWidth ? 'w-full' : '',
          isDisabled ? 'cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading && <Spinner className="shrink-0" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
