'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { THEMES } from '@/lib/themes'

const STORAGE_KEY = 'user-preferred-theme'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children, siteDefault = 'warm' }) {
  const [userKey, setUserKey] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Read saved preference on mount (client only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && THEMES[stored]) setUserKey(stored)
    setMounted(true)
  }, [])

  const activeKey   = mounted && userKey ? userKey : siteDefault
  const activeTheme = THEMES[activeKey] || THEMES.warm

  // Apply CSS vars whenever active theme changes.
  // Skip the very first mount when the anti-flash script already did the work.
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement

    if (isFirstMount.current) {
      // The blocking <script> already applied the correct vars — no DOM work needed,
      // and no transition should fire on load.
      isFirstMount.current = false
      return
    }

    // Subsequent changes: animate the colour transition
    root.setAttribute('data-theme-changing', '')
    const t = setTimeout(() => root.removeAttribute('data-theme-changing'), 400)

    Object.entries(activeTheme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    if (activeTheme.dark) root.classList.add('dark')
    else root.classList.remove('dark')

    return () => clearTimeout(t)
  }, [activeKey, mounted])

  const setTheme = useCallback((key) => {
    if (!key) {
      localStorage.removeItem(STORAGE_KEY)
      setUserKey(null)
    } else {
      localStorage.setItem(STORAGE_KEY, key)
      setUserKey(key)
    }
  }, [])

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
