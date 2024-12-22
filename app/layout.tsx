import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'service catalog REST server',
  description: 'Your central hub for managing services, repositories, and build information',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body className="font-poppins bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">{children}</body>
    </html>
  )
}
