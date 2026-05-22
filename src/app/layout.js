import './globals.css'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title:       { default: 'Digitolio — Find Food Menus Near You', template: '%s | Digitolio' },
  description: 'Digitolio helps you find the best food menus at hotels, restaurants, food shops and snack bars across Sri Lanka. Search by food, price, town or province.',
  keywords:    ['Sri Lanka restaurants', 'food menu', 'hotel menu', 'snack bar', 'food shop', 'Galle', 'Colombo', 'Kandy'],
  openGraph: {
    type:  'website',
    title: 'Digitolio — Find Food Menus Near You',
    description: 'Find menus at hotels, restaurants, food shops and snack bars across Sri Lanka.',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakartaSans.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#ff2d55" />
        <meta name="mobile-web-app-capable" content="yes" />
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
