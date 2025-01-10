import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Service Catalog',
  description: 'Your central hub for managing services, repositories, and build information',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">{children}</body>
    </html>
  )
}
