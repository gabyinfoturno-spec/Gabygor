'use client'

import { useActionState } from 'react'
import { changePassword } from './actions'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, null)

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4 text-[var(--text-primary)]">
      <ThemeToggle className="absolute top-4 right-4" />

      <div className="w-full max-w-md animate-fade-in">
        <Card className="p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--gold-primary)]">
              GabyGor
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
              Actualizar Contraseña
            </p>
            <p className="mt-2 text-xs text-red-500 font-medium leading-relaxed">
              Por motivos de seguridad, tenés que configurar una nueva contraseña privada antes de ingresar al panel.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <Input
              label="Nueva Contraseña"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />

            <Input
              label="Confirmar Nueva Contraseña"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />

            {state?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
                {state.error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isPending}
                className="py-3 text-sm font-semibold"
              >
                {isPending ? 'Guardando...' : 'Establecer Contraseña'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
