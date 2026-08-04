import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

// ── Tipografías ──────────────────────────────────
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

// ── SEO Metadata ─────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'Turnero – Reservá tu turno',
    template: '%s | Turnero',
  },
  description:
    'Reservá tu turno en nuestra barbería de forma rápida y sencilla. Elegí servicio, fecha y horario en segundos.',
  keywords: ['barbería', 'turnos', 'reservas', 'corte de pelo', 'barber shop'],
  authors: [{ name: 'Turnero App' }],
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Turnero',
    title: 'Turnero – Reservá tu turno',
    description: 'Sistema de reservas para barbería premium.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
}

// ── Root Layout ──────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${playfair.variable} ${inter.variable}`}
    >
      <body className="min-h-screen font-body antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
