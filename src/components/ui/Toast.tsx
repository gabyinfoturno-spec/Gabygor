'use client'

import React, { createContext, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function toast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              'flex min-w-[280px] items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
              'animate-[slide-up_0.3s_ease-out] border',
              t.type === 'success' && 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400',
              t.type === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400',
              t.type === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400'
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 hover:opacity-80 transition-opacity"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
