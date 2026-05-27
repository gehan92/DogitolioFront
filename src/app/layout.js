import './globals.css'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { THEMES, buildThemeStyle } from '@/lib/themes'

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

async function getActiveTheme() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const res = await fetch(`${base}/api/site-content/settings`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return THEMES.warm
    const data = await res.json()
    return THEMES[data?.content?.theme] || THEMES.warm
  } catch {
    return THEMES.warm
  }
}

export default async function RootLayout({ children }) {
  const theme = await getActiveTheme()
  const themeStyle = buildThemeStyle(theme)

  return (
    <html lang="en" suppressHydrationWarning className={`${jakartaSans.variable} ${inter.variable}`}>
      <head>
        {/* Injected before stylesheets so CSS vars in globals.css serve as fallback */}
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content={theme.vars['--c-brand']} />
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
