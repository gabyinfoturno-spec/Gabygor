import { createAdminClient } from '@/lib/supabase/admin'
import { ClientPortal } from '@/components/client-portal/ClientPortal'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata() {
  return {
    title: 'Mis Turnos — GabyGor',
    description: 'Gestioná tus turnos reservados en GabyGor.',
  }
}

export default async function ClientPortalPage({ params }: PageProps) {
  const { token } = await params

  if (!token) {
    return <InvalidTokenScreen />
  }

  // Use admin client since clients read via unique secret token
  const supabase = createAdminClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, full_name, email, access_token')
    .eq('access_token', token)
    .single()

  if (error || !client) {
    return <InvalidTokenScreen />
  }

  return (
    <ClientPortal
      client={{
        id: client.id,
        fullName: client.full_name,
        email: client.email,
        accessToken: client.access_token,
      }}
    />
  )
}

function InvalidTokenScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-secondary)] px-4 text-center text-[var(--text-primary)]">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
            Enlace inválido o expirado
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            El link de acceso no es válido. Asegurate de haber hecho clic en el enlace que te enviamos por correo electrónico al confirmar tu turno.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--gold-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-gold)] hover:brightness-110 transition-all duration-200"
          >
            Reservar nuevo turno
          </Link>
        </div>
      </div>
    </div>
  )
}
