'use client'

import { type ReactNode, useEffect, useCallback, useRef } from 'react'

// ── Tipos ────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Ancho máximo personalizado (por defecto md → 28rem) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const maxWidthStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

// ── Componente ───────────────────────────────────
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Cerrar al hacer clic en el overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Modal'}
      onClick={handleOverlayClick}
      className={[
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-[var(--overlay)] backdrop-blur-sm',
        'animate-fade-in',
      ].join(' ')}
    >
      {/* Card */}
      <div
        className={[
          'w-full rounded-2xl border border-[var(--border-color)]',
          'bg-[var(--bg-primary)] shadow-[var(--shadow-lg)]',
          'animate-scale-in',
          maxWidthStyles[maxWidth],
        ].join(' ')}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            {title && (
              <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            <button
              type="button"
              onClick={onClose}
              className={[
                'ml-auto flex items-center justify-center',
                'h-8 w-8 rounded-lg',
                'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                'hover:bg-[var(--bg-secondary)]',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label="Cerrar"
            >
              {/* X icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
