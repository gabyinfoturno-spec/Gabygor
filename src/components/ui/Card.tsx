import { type HTMLAttributes, type ReactNode } from 'react'

// ── Tipos ────────────────────────────────────────
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: CardPadding
  /** Muestra borde dorado y estado visual seleccionado */
  selected?: boolean
  /** Agrega cursor-pointer y hover effects */
  interactive?: boolean
}

// ── Estilos ──────────────────────────────────────
const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

// ── Componente ───────────────────────────────────
export function Card({
  children,
  padding = 'md',
  selected = false,
  interactive = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        // Base
        'rounded-xl border transition-all duration-200 ease-out',
        'bg-[var(--bg-primary)]',

        // Borde
        selected
          ? 'border-[var(--gold-primary)] shadow-[var(--shadow-gold)]'
          : 'border-[var(--border-color)]',

        // Interactivo
        interactive && !selected
          ? 'cursor-pointer hover:border-[var(--gold-primary)] hover:shadow-[var(--shadow-md)]'
          : '',
        interactive ? 'cursor-pointer' : '',

        // Padding
        paddingStyles[padding],

        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
