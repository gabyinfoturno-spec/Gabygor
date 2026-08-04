import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'

import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()

  // Double check auth status on the server side
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-6 shadow-sm">
          <div className="pl-12 md:pl-0">
            <span className="font-heading text-lg font-bold text-[var(--gold-primary)] sm:text-xl">
              GabyGor
            </span>
            <span className="ml-2 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-sm text-[var(--text-secondary)] md:block">
              Sesión: {user.email}
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
