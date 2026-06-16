'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { THEMES } from '@/lib/themes'

const STORAGE_KEY = 'user-preferred-theme'

const ThemeCtx = createContext(null)

/** Apply a theme's CSS vars + dark class directly to <html> */
function applyThemeToDOM(theme, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.setAttribute('data-theme-changing', '')
    setTimeout(() => root.removeAttribute('data-theme-changing'), 400)
  }
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  if (theme.dark) root.classList.add('dark')
  else            root.classList.remove('dark')
}

export function ThemeProvider({ children, siteDefault = 'warm' }) {
  const [userKey, setUserKey] = useState(null)
  const [mounted, setMounted] = useState(false)

  // On mount: read stored preference, apply immediately (no flash)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const key    = stored && THEMES[stored] ? stored : null
    setUserKey(key)
    setMounted(true)
    const theme = THEMES[key || siteDefault] || THEMES.warm
    applyThemeToDOM(theme, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeKey   = userKey ?? siteDefault
  const activeTheme = THEMES[activeKey] || THEMES.warm

  const setTheme = useCallback((key) => {
    const resolvedKey = key && THEMES[key] ? key : null
    if (resolvedKey) {
      localStorage.setItem(STORAGE_KEY, resolvedKey)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setUserKey(resolvedKey)
    const theme = THEMES[resolvedKey ?? siteDefault] || THEMES.warm
    applyThemeToDOM(theme, true)
  }, [siteDefault])

  return (
    <ThemeCtx.Provider value={{ activeKey, activeTheme, userKey, siteDefault, setTheme, mounted }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
