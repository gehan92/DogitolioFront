import './globals.css'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { THEMES, buildThemeStyle, buildThemeSnapshot } from '@/lib/themes'

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
  metadataBase: new URL('https://www.mealhere.com'),
  title:       { default: 'MealHere — Find Food Menus Near You', template: '%s | MealHere' },
  description: 'MealHere helps you find the best food menus at hotels, restaurants, food shops and snack bars across Sri Lanka. Search by food, price, town or province.',
  keywords:    ['Sri Lanka restaurants', 'food menu', 'hotel menu', 'snack bar', 'food shop', 'Galle', 'Colombo', 'Kandy'],
  alternates:  { canonical: '/' },
  icons: {
    icon: '/logo.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type:  'website',
    url:   'https://www.mealhere.com',
    siteName: 'MealHere',
    title: 'MealHere — Find Food Menus Near You',
    description: 'Find menus at hotels, restaurants, food shops and snack bars across Sri Lanka.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MealHere — Find Food Menus Near You',
    description: 'Find menus at hotels, restaurants, food shops and snack bars across Sri Lanka.',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MealHere',
  url: 'https://www.mealhere.com',
  logo: 'https://www.mealhere.com/logo.png',
}

async function getActiveThemeKey() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const res = await fetch(`${base}/api/site-content/settings`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return 'warm'
    const data = await res.json()
    const key = data?.content?.theme
    return THEMES[key] ? key : 'warm'
  } catch {
    return 'warm'
  }
}

export default async function RootLayout({ children }) {
  const themeKey    = await getActiveThemeKey()
  const theme       = THEMES[themeKey] || THEMES.warm
  const themeStyle  = buildThemeStyle(theme)
  const themeSnapshot = buildThemeSnapshot()

  // Blocking script: runs synchronously before first paint.
  // Reads localStorage, and if a valid preference exists, overrides the
  // server-rendered CSS vars immediately — zero flash of wrong theme.
  const antiFlashScript = `
(function(){
  var STORAGE_KEY='user-preferred-theme';
  var THEMES=${JSON.stringify(themeSnapshot)};
  try{
    var key=localStorage.getItem(STORAGE_KEY);
    if(key&&THEMES[key]){
      var t=THEMES[key];
      var r=document.documentElement;
      var v=t.vars;
      for(var p in v){if(Object.prototype.hasOwnProperty.call(v,p)){r.style.setProperty(p,v[p]);}}
      if(t.dark){r.classList.add('dark');}else{r.classList.remove('dark');}
    }
  }catch(e){}
})();
`.trim()

  return (
    <html lang="en" suppressHydrationWarning className={`${jakartaSans.variable} ${inter.variable}`}>
      <head>
        {/* Anti-flash: runs before paint, reads localStorage, sets CSS vars instantly */}
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        {/* Server-rendered theme vars — used when no user preference is stored */}
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <meta name="theme-color" content={theme.vars['--c-brand']} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider siteDefault={themeKey}>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
