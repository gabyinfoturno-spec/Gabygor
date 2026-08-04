'use client'

import { ManageAppointmentsButton } from './ManageAppointmentsButton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface HeaderProps {
  mainTitle: string
}

export function Header({ mainTitle }: HeaderProps) {
  const handleLogoClick = () => {
    // Dispatch a custom event to reset the booking flow
    const event = new CustomEvent('gabygor-reset-flow')
    window.dispatchEvent(event)
  }

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] py-6 shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="space-y-0.5">
          <h1 
            onClick={handleLogoClick}
            className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[var(--gold-primary)] sm:text-4xl cursor-pointer hover:opacity-80 select-none transition-opacity duration-200"
          >
            {mainTitle}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ManageAppointmentsButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
