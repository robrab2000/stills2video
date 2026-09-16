import type { Metadata } from 'next'
import { Syne, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { AppProvider } from '../contexts/AppContext'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Stills-2-Video',
  description: 'Drop stills. Export video. All in your browser.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${sourceSans.variable} font-ui antialiased`}>
        <div className="app-grain" aria-hidden="true" />
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster
          toastOptions={{
            className: 'font-ui',
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
