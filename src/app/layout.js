import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

export const metadata = {
  title:       { default: 'Kade — Discover Sri Lanka\'s Restaurants', template: '%s | Kade' },
  description: 'Find the best restaurants in Sri Lanka. Search by food, price, town, district or province. View menus and read reviews.',
  keywords:    ['Sri Lanka restaurants', 'food discovery', 'menu', 'Galle', 'Colombo', 'Kandy'],
  openGraph: {
    type:  'website',
    title: 'Kade — Discover Sri Lanka\'s Restaurants',
    description: 'Find restaurants by food name, price, location across Sri Lanka.',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#e8702a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
