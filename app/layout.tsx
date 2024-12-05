import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Service Catalog',
  description: 'Service catalog application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body>{children}</body>
    </html>
  )
}
