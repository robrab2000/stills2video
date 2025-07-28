import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { AppProvider } from '../contexts/AppContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Stills-2-Video Converter',
  description: 'A simple image sequence to video converter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
} 