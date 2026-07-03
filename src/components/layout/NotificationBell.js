'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import clsx from 'clsx'

const POLL_MS = 30000

function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)  return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

const DOT_COLOR = {
  info:    '#3b82f6',
  warning: '#f59e0b',
  success: '#10b981',
  error:   '#ef4444',
}

export default function NotificationBell() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [open,        setOpen]        = useState(false)
  const [items,       setItems]       = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const d = await api.notifications.list({ limit: 8 }, token)
      setItems(d.data || [])
      setUnreadCount(d.unreadCount ?? 0)
    } catch { /* silent — bell just stays as-is until next poll */ }
  }, [token])

  useEffect(() => {
    if (!token) { setItems([]); setUnreadCount(0); return }
    fetchNotifications()
    const id = setInterval(fetchNotifications, POLL_MS)
    return () => clearInterval(id)
  }, [token, fetchNotifications])

  async function openBell() {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      await fetchNotifications()
      setLoading(false)
    }
  }

  async function handleClick(n) {
    setOpen(false)
    if (!n.is_read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
      api.notifications.read(n.id, token).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  async function markAllRead() {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })))
    setUnreadCount(0)
    try { await api.notifications.readAll(token) } catch {}
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={openBell}
        className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
        style={{ color: open ? 'var(--c-brand)' : 'var(--c-muted)', background: open ? 'var(--c-brand-lt)' : '' }}
        title="Notifications" aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#ef4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 max-w-[90vw] rounded-2xl p-1.5 animate-fade-in"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 8px 40px rgba(0,0,0,.14)' }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 mb-1 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--c-text)' }}>Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-[12px]" style={{ color: 'var(--c-dim)' }}>Loading…</div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center text-[12px]" style={{ color: 'var(--c-dim)' }}>No notifications yet</div>
              ) : (
                items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors duration-150"
                    style={{ background: n.is_read ? '' : 'var(--c-surface2)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '' : 'var(--c-surface2)' }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: n.is_read ? 'var(--c-border)' : (DOT_COLOR[n.type] || DOT_COLOR.info) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block text-[12.5px] leading-snug', n.is_read ? 'font-medium' : 'font-bold')} style={{ color: 'var(--c-text)' }}>
                        {n.title}
                      </span>
                      <span className="block text-[12px] leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--c-muted)' }}>
                        {n.message}
                      </span>
                      <span className="block text-[10.5px] mt-1" style={{ color: 'var(--c-dim)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
