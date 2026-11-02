import type { Metadata, Viewport } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { THEME_COOKIE } from '@/lib/theme'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Obscura — Turn your lecture into a quiz',
  description: 'Upload your lecture slides. Obscura writes flashcards from the text and quizzes you on every labelled diagram.',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F5F1' },
    { media: '(prefers-color-scheme: dark)', color: '#161A1D' },
  ],
}

// Runs before first paint so a saved Light/Dark choice never flashes the other
// theme. Reading the cookie on the server instead would make every page dynamic.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m)document.documentElement.setAttribute('data-theme',m[1])}catch(e){}})()`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${manrope.variable} ${inter.variable}`}>{children}</body>
    </html>
  )
}
