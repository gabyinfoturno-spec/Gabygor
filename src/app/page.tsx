import { createClient } from '@/lib/supabase/server'
import { BookingFlow } from '@/components/booking/BookingFlow'
import { Header } from '@/components/booking/Header'

export const revalidate = 0 // Disable cache to always get fresh site settings

export default async function Home() {
  const supabase = await createClient()

  // Verificar si hay una sesión activa de administrador para el redireccionamiento del footer
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const barberEmail = (process.env.BARBER_EMAIL || 'gabi26acosta777@gmail.com').toLowerCase().trim()
  const allowedAdmins = [barberEmail, 'admin@admin.com'].filter(Boolean)
  const isAdmin = user && user.email && allowedAdmins.includes(user.email.toLowerCase().trim())
  const adminLink = isAdmin ? '/admin' : '/admin/login'

  const { data: settings } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value')

  const settingsMap: Record<string, string> = {}
  settings?.forEach((s) => {
    if (s.setting_key) {
      settingsMap[s.setting_key] = s.setting_value || ''
    }
  })

  const mainTitle = settingsMap.main_title || 'GabyGor'
  const infoText = settingsMap.info_text || 'Reservá tu turno de forma rápida y sencilla'
  const infoMessage = settingsMap.info_message || ''
  const showInfoMessage = settingsMap.info_message_visible === 'true'
  const city = settingsMap.current_city || ''
  const instagram = settingsMap.barber_instagram || ''
  const phone = settingsMap.barber_phone || ''

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* Header */}
      <Header mainTitle={mainTitle} />

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Welcome Info */}
          <div className="text-center">
            <p className="mx-auto max-w-xl text-base text-[var(--text-secondary)] sm:text-lg">
              {infoText}
            </p>
          </div>

          {/* Info Banner */}
          {showInfoMessage && infoMessage && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--gold-primary)]/30 bg-[var(--bg-primary)] p-5 shadow-sm text-[var(--text-primary)] transition-all duration-300">
              <div className="flex gap-3.5">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--gold-primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="space-y-1">
                  {city && (
                    <p className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                      Ubicación actual: {city}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {infoMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Booking Flow Container */}
          <BookingFlow />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-8 text-center text-xs text-[var(--text-secondary)]">
        <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6">
          <p className="font-medium tracking-wide">
            © {new Date().getFullYear()} {mainTitle} — Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-6">
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--gold-primary)] transition-colors"
              >
                Instagram
              </a>
            )}
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--gold-primary)] transition-colors"
              >
                WhatsApp
              </a>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Sitio web desarrollado por{' '}
            <a
              href="https://mateorojas.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--gold-primary)] underline transition-colors"
            >
              Mateo Rojas
            </a>
          </p>
          <p className="text-[9px] text-[var(--text-tertiary)]/60">
            <a
              href={adminLink}
              className="hover:text-[var(--gold-primary)] underline transition-colors"
            >
              Acceso Administrativo
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
