'use client'
import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, UtensilsCrossed, MessageSquare, Users, Upload,
  Plus, Check, X, Trash2, Shield, Image, FileText, Pencil, Tag,
  Menu, Clock, Home, ChevronRight, ChevronLeft, Zap, ZapOff, History,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import clsx from 'clsx'

const PAGE_SIZE = 12

const NAV_ITEMS = [
  { key: 'Overview',     label: 'Overview',     icon: LayoutDashboard },
  { key: 'Restaurants',  label: 'Restaurants',  icon: UtensilsCrossed },
  { key: 'Boost',        label: 'Boost',        icon: Zap },
  { key: 'Reviews',      label: 'Reviews',      icon: MessageSquare },
  { key: 'Users',        label: 'Users',        icon: Users },
  { key: 'Menu Items',   label: 'Menu Items',   icon: Tag },
  { key: 'Site Content', label: 'Site Content', icon: FileText },
  { key: 'History',      label: 'History',      icon: Clock },
]

// ── Reusable pagination bar ────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPageChange, loading = false }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--c-border)]">
      <p className="text-xs text-[var(--c-muted)]">
        Page{' '}
        <span className="font-semibold text-[var(--c-text)]">{page}</span>
        {' '}of{' '}
        <span className="font-semibold text-[var(--c-text)]">{totalPages}</span>
        {total > 0 && (
          <span className="ml-1.5 text-[var(--c-dim)]">· {total.toLocaleString()} total</span>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Tab-level loading placeholder ─────────────────────────────────────────
function TabSpinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <Spinner size={28} />
    </div>
  )
}

// ── Main admin page ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, profile, isAdmin, loading: authLoading, token } = useAuth()
  const router = useRouter()

  // ── Navigation
  const [tab,         setTab]         = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tabsLoaded,  setTabsLoaded]  = useState(new Set(['Overview']))

  // ── Global state (initial load)
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restaurants (paginated, for table display)
  const [restaurants,     setRestaurants]     = useState([])
  const [restPage,        setRestPage]        = useState(1)
  const [restTotal,       setRestTotal]       = useState(0)
  const [restTotalPages,  setRestTotalPages]  = useState(1)
  const [restsLoading,    setRestsLoading]    = useState(false)

  // ── Restaurant options (all, for dropdowns — not paginated)
  const [restaurantOptions, setRestaurantOptions] = useState([])

  // ── Reviews (paginated)
  const [reviews,         setReviews]         = useState([])
  const [revPage,         setRevPage]         = useState(1)
  const [revTotal,        setRevTotal]        = useState(0)
  const [revTotalPages,   setRevTotalPages]   = useState(1)
  const [revsLoading,     setRevsLoading]     = useState(false)

  // ── Users (paginated)
  const [users,           setUsers]           = useState([])
  const [usersPage,       setUsersPage]       = useState(1)
  const [usersTotal,      setUsersTotal]      = useState(0)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usrsLoading,     setUsrsLoading]     = useState(false)

  // ── Audit logs (paginated)
  const [auditLogs,      setAuditLogs]      = useState([])
  const [logsPage,       setLogsPage]       = useState(1)
  const [logsTotal,      setLogsTotal]      = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [auditLoading,   setAuditLoading]   = useState(false)

  // ── Menu upload state
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [pdfFile,            setPdfFile]            = useState(null)
  const [uploading,          setUploading]          = useState(false)
  const [uploadMsg,          setUploadMsg]          = useState('')

  // ── Menu items state
  const [miRestaurant, setMiRestaurant] = useState('')
  const [menuItems,    setMenuItems]    = useState([])
  const [miLoading,    setMiLoading]    = useState(false)
  const [miForm, setMiForm] = useState({
    name: '', description: '', price: '', category: '',
    discount_type: '', discount_value: '', photo: null,
  })
  const [miEditId, setMiEditId] = useState(null)
  const [miSaving, setMiSaving] = useState(false)
  const [miMsg,    setMiMsg]    = useState('')

  // ── Site Content state
  const [scPage,    setScPage]    = useState('home')
  const [scFields,  setScFields]  = useState({})
  const [scLoading, setScLoading] = useState(false)
  const [scSaving,  setScSaving]  = useState(false)
  const [scMsg,     setScMsg]     = useState('')

  const SC_SCHEMAS = {
    home:    ['headline', 'subheadline', 'ctaText'],
    about:   ['headline', 'subheadline', 'storyTitle', 'storyP1', 'storyP2'],
    contact: ['headline', 'subheadline', 'email', 'phone', 'location', 'hours'],
  }

  // ── Boost state
  const [boostPlan,       setBoostPlan]       = useState('30')
  const [boostMsg,        setBoostMsg]        = useState('')
  const [historyOpenId,   setHistoryOpenId]   = useState(null)
  const [boostHistoryMap, setBoostHistoryMap] = useState({})
  const [historyLoading,  setHistoryLoading]  = useState(false)

  // ── Auth guard
  useEffect(() => {
    if (!authLoading && user && profile && !isAdmin) router.replace('/')
    if (!authLoading && !user) router.replace('/')
  }, [user, profile, isAdmin, authLoading])

  // ── Initial load: stats + dropdown options
  useEffect(() => {
    if (!token || !isAdmin) return
    loadInitial()
  }, [token, isAdmin])

  // ── Data loaders ───────────────────────────────────────────────────────

  async function loadInitial() {
    setLoading(true)
    try {
      const [statsData, optsData] = await Promise.all([
        api.admin.stats(token),
        api.restaurants.list({ limit: 200 }),
      ])
      setStats(statsData)
      setRestaurantOptions(optsData.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadRestaurants(page = 1) {
    setRestsLoading(true)
    try {
      const data = await api.restaurants.list({ page, limit: PAGE_SIZE })
      setRestaurants(data.data || [])
      setRestTotal(data.total ?? 0)
      setRestTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setRestPage(page)
    } catch (err) { console.error(err) }
    finally { setRestsLoading(false) }
  }

  async function loadReviews(page = 1) {
    setRevsLoading(true)
    try {
      const data = await api.admin.reviews({ page, limit: PAGE_SIZE }, token)
      setReviews(data.data || [])
      setRevTotal(data.total ?? 0)
      setRevTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setRevPage(page)
    } catch (err) { console.error(err) }
    finally { setRevsLoading(false) }
  }

  async function loadUsers(page = 1) {
    setUsrsLoading(true)
    try {
      const data = await api.admin.users({ page, limit: PAGE_SIZE }, token)
      setUsers(data.data || [])
      setUsersTotal(data.total ?? 0)
      setUsersTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setUsersPage(page)
    } catch (err) { console.error(err) }
    finally { setUsrsLoading(false) }
  }

  async function loadAuditLogs(page = 1) {
    setAuditLoading(true)
    try {
      const data = await api.admin.auditLogs({ page, limit: PAGE_SIZE }, token)
      setAuditLogs(data.data || [])
      setLogsTotal(data.total ?? 0)
      setLogsTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
      setLogsPage(page)
    } catch { setAuditLogs([]) }
    finally { setAuditLoading(false) }
  }

  // ── Lazy tab navigation ────────────────────────────────────────────────
  function navigate(key) {
    setTab(key)
    setSidebarOpen(false)
    if (tabsLoaded.has(key)) return

    setTabsLoaded(prev => new Set([...prev, key]))

    // Restaurants and Boost share the same paginated list
    if ((key === 'Restaurants' || key === 'Boost') &&
        !tabsLoaded.has('Restaurants') && !tabsLoaded.has('Boost')) {
      loadRestaurants(1)
    } else if (key === 'Reviews') {
      loadReviews(1)
    } else if (key === 'Users') {
      loadUsers(1)
    } else if (key === 'History') {
      loadAuditLogs(1)
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleUpload(e) {
    e.preventDefault()
    if (!selectedRestaurant || !pdfFile) return
    setUploading(true); setUploadMsg('')
    try {
      const form = new FormData()
      form.append('menu', pdfFile)
      const result = await api.menus.upload(selectedRestaurant, form, token)
      setUploadMsg(`✓ Menu uploaded — version ${result.version}`)
      setPdfFile(null); setSelectedRestaurant('')
    } catch (err) {
      setUploadMsg(`Error: ${err.message}`)
    } finally { setUploading(false) }
  }

  async function deleteRestaurant(restaurantId, name) {
    if (!confirm(`Delete "${name}"?\n\nThis will deactivate the restaurant and hide it from the public.`)) return
    try {
      await api.restaurants.delete(restaurantId, token)
      // Go back one page if we deleted the last item on a non-first page
      const targetPage = restaurants.length === 1 && restPage > 1 ? restPage - 1 : restPage
      await loadRestaurants(targetPage)
      // Refresh dropdown options
      const opts = await api.restaurants.list({ limit: 200 })
      setRestaurantOptions(opts.data || [])
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  async function deleteReview(reviewId) {
    if (!confirm('Delete this review?')) return
    await api.admin.deleteReview(reviewId, token)
    const targetPage = reviews.length === 1 && revPage > 1 ? revPage - 1 : revPage
    await loadReviews(targetPage)
  }

  async function approveReview(reviewId, approve) {
    await api.admin.patchReview(reviewId, { is_approved: approve }, token)
    setReviews(r => r.map(rev => rev.id === reviewId ? { ...rev, is_approved: approve } : rev))
  }

  async function toggleBan(userId, isBanned) {
    await api.admin.patchUser(userId, { is_banned: !isBanned }, token)
    setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_banned: !isBanned } : usr))
  }

  // ── Menu Items handlers ────────────────────────────────────────────────
  async function loadMenuItems(restaurantId) {
    if (!restaurantId) return
    setMiLoading(true)
    try {
      const data = await api.menuItems.list(restaurantId)
      setMenuItems(data?.data || [])
    } catch { setMenuItems([]) }
    finally { setMiLoading(false) }
  }

  function miStartEdit(item) {
    setMiEditId(item.id)
    setMiForm({
      name: item.name, description: item.description || '',
      price: item.price, category: item.category || '',
      discount_type: item.discount_type || '', discount_value: item.discount_value || '',
      photo: null,
    })
  }

  function miReset() {
    setMiEditId(null)
    setMiForm({ name: '', description: '', price: '', category: '', discount_type: '', discount_value: '', photo: null })
    setMiMsg('')
  }

  async function miSave(e) {
    e.preventDefault()
    if (!miRestaurant) return
    setMiSaving(true); setMiMsg('')
    try {
      const fd = new FormData()
      fd.append('name',           miForm.name)
      fd.append('description',    miForm.description)
      fd.append('price',          miForm.price)
      fd.append('category',       miForm.category)
      fd.append('discount_type',  miForm.discount_type)
      fd.append('discount_value', miForm.discount_value)
      if (miForm.photo) fd.append('photo', miForm.photo)

      if (miEditId) {
        const updated = await api.menuItems.update(miEditId, fd, token)
        setMenuItems(items => items.map(i => i.id === miEditId ? updated : i))
        miReset(); setMiMsg('✓ Item updated')
      } else {
        const created = await api.menuItems.create(miRestaurant, fd, token)
        setMenuItems(items => [...items, created])
        miReset(); setMiMsg('✓ Item added')
      }
    } catch (err) { setMiMsg(`Error: ${err.message}`) }
    finally { setMiSaving(false) }
  }

  async function miDelete(id) {
    if (!confirm('Delete this menu item?')) return
    await api.menuItems.delete(id, token)
    setMenuItems(items => items.filter(i => i.id !== id))
  }

  // ── Site Content handlers ──────────────────────────────────────────────
  async function scLoad(page) {
    setScLoading(true); setScMsg('')
    try {
      const data = await api.siteContent.get(page)
      setScFields(data?.content || {})
    } catch { setScFields({}) }
    finally { setScLoading(false) }
  }

  async function scSave(e) {
    e.preventDefault()
    setScSaving(true); setScMsg('')
    try {
      await api.siteContent.update(scPage, scFields, token)
      setScMsg('✓ Saved successfully')
    } catch (err) { setScMsg(`Error: ${err.message}`) }
    finally { setScSaving(false) }
  }

  // ── Boost helpers ──────────────────────────────────────────────────────
  function isBoostActive(r) {
    return r.is_boosted && (!r.boost_expires_at || new Date(r.boost_expires_at) > new Date())
  }

  async function quickBoost(restaurantId, enabled, plan) {
    setBoostMsg('')
    try {
      const updated = await api.restaurants.boost(restaurantId, { enabled, plan }, token)
      // Optimistic update both paginated list and dropdown options
      setRestaurants(rs => rs.map(r => r.id === restaurantId ? { ...r, ...updated } : r))
      setRestaurantOptions(opts => opts.map(r => r.id === restaurantId ? { ...r, ...updated } : r))
      setBoostMsg(enabled ? '✓ Boost activated' : '✓ Boost removed')
      if (historyOpenId === restaurantId) {
        setBoostHistoryMap(m => ({ ...m, [restaurantId]: undefined }))
        loadBoostHistory(restaurantId)
      }
    } catch (err) { setBoostMsg(`Error: ${err.message}`) }
  }

  async function loadBoostHistory(restaurantId) {
    if (historyOpenId === restaurantId) { setHistoryOpenId(null); return }
    setHistoryOpenId(restaurantId)
    if (boostHistoryMap[restaurantId]) return
    setHistoryLoading(true)
    try {
      const result = await api.restaurants.boostHistory(restaurantId, token)
      setBoostHistoryMap(m => ({ ...m, [restaurantId]: result.data || [] }))
    } catch {
      setBoostHistoryMap(m => ({ ...m, [restaurantId]: [] }))
    } finally { setHistoryLoading(false) }
  }

  // ── Derived boost stats from full restaurant options list ──────────────
  const boostActiveCount  = restaurantOptions.filter(isBoostActive).length
  const boostExpiredCount = restaurantOptions.filter(r =>
    r.is_boosted && r.boost_expires_at && new Date(r.boost_expires_at) <= new Date()
  ).length

  // ── Early returns ──────────────────────────────────────────────────────
  if (authLoading || loading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  const currentNav = NAV_ITEMS.find(n => n.key === tab)

  return (
    <>
      <Navbar />

      <div className="flex min-h-[calc(100vh-66px)]">

        {/* ── Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar */}
        <aside className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out',
          'lg:sticky lg:top-[66px] lg:h-[calc(100vh-66px)] lg:translate-x-0 lg:z-10',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )} style={{ boxShadow: '4px 0 24px rgba(0,0,0,.06)' }}>

          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Shield size={17} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[13px] text-gray-900 leading-tight">Admin Panel</p>
              <p className="text-[11px] text-gray-400 truncate">{profile?.name || user?.email}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 mb-0.5',
                    active
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  style={active ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
                </button>
              )
            })}
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150"
            >
              <Home size={16} className="shrink-0" />
              Back to site
            </Link>
          </div>
        </aside>

        {/* ── Main content */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Mobile top bar */}
          <div
            className="lg:hidden sticky top-[66px] z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {currentNav && <currentNav.icon size={15} className="text-[#FF2D55]" />}
              <span className="font-bold text-[14px] text-gray-900">{tab}</span>
            </div>
          </div>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-5xl w-full mx-auto">

            <div className="hidden lg:flex items-center gap-2 mb-7">
              {currentNav && <currentNav.icon size={18} className="text-[#FF2D55]" />}
              <h1 className="font-bold text-xl text-gray-900">{tab}</h1>
            </div>

            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {tab === 'Overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Restaurants', value: stats?.stats?.restaurants, icon: UtensilsCrossed },
                    { label: 'Reviews',     value: stats?.stats?.reviews,     icon: MessageSquare },
                    { label: 'Users',       value: stats?.stats?.users,       icon: Users },
                    { label: 'Menus',       value: stats?.stats?.menus,       icon: Upload },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="card p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-[#FF2D55]" />
                        <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide">{label}</p>
                      </div>
                      <p className="font-display text-3xl font-black text-[var(--c-text)]">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="card p-5">
                    <h3 className="font-semibold text-[var(--c-text)] mb-3">Recent reviews</h3>
                    {stats?.recentReviews?.length ? stats.recentReviews.map(r => (
                      <div key={r.id} className="flex items-start gap-2 py-2 border-b border-[var(--c-border)] last:border-0 text-sm">
                        <span className="text-amber-500 font-bold shrink-0">{'★'.repeat(r.rating)}</span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.restaurants?.name}</p>
                          <p className="text-[var(--c-muted)] truncate text-xs">{r.comment || '(no comment)'}</p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-[var(--c-muted)]">No recent reviews</p>}
                  </div>

                  <div className="card p-5">
                    <h3 className="font-semibold text-[var(--c-text)] mb-3">Recent menu uploads</h3>
                    {stats?.recentMenus?.length ? stats.recentMenus.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-[var(--c-border)] last:border-0 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.restaurants?.name}</p>
                          <p className="text-xs text-[var(--c-muted)]">v{m.version} · {m.profiles?.name}</p>
                        </div>
                        <Badge color="green">Live</Badge>
                      </div>
                    )) : <p className="text-sm text-[var(--c-muted)]">No uploads yet</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── RESTAURANTS ──────────────────────────────────────────── */}
            {tab === 'Restaurants' && (
              <div className="space-y-5 animate-fade-in">

                {/* Menu upload */}
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-[#FF2D55]" />
                    Upload / replace menu PDF
                  </h3>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Select restaurant</label>
                      <select
                        value={selectedRestaurant}
                        onChange={e => setSelectedRestaurant(e.target.value)}
                        required
                        className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                      >
                        <option value="">— Choose restaurant —</option>
                        {restaurantOptions.map(r => (
                          <option key={r.id} value={r.id}>{r.name} — {r.town}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">PDF menu file</label>
                      <div className={clsx(
                        'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                        pdfFile ? 'border-[#FF2D55]/40 bg-red-50/30' : 'border-[var(--c-border2)] hover:border-[#FF2D55]/30',
                      )}>
                        <input
                          type="file" accept="application/pdf"
                          onChange={e => setPdfFile(e.target.files[0])}
                          className="hidden" id="pdf-upload" required
                        />
                        <label htmlFor="pdf-upload" className="cursor-pointer">
                          {pdfFile ? (
                            <div>
                              <p className="font-semibold text-[#FF2D55]">{pdfFile.name}</p>
                              <p className="text-xs text-[#FF2D55]/70 mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <div>
                              <Upload size={24} className="mx-auto mb-2 text-[var(--c-dim)]" />
                              <p className="text-sm text-[var(--c-muted)]">Click to select PDF (max 20 MB)</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="submit" loading={uploading} disabled={!selectedRestaurant || !pdfFile}>
                        <Upload size={15} /> Upload menu
                      </Button>
                      {uploadMsg && (
                        <p className={clsx('text-sm font-medium', uploadMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>
                          {uploadMsg}
                        </p>
                      )}
                    </div>
                  </form>
                </div>

                {/* Restaurants list */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      All restaurants
                      {restTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({restTotal})</span>}
                    </h3>
                    <Link href="/admin/restaurants/new">
                      <Button size="sm" variant="secondary"><Plus size={14} /> Add new</Button>
                    </Link>
                  </div>

                  {restsLoading ? <TabSpinner /> : restaurants.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No restaurants yet.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {restaurants.map(r => (
                          <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                                {isBoostActive(r) && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                    <Zap size={8} className="fill-white" /> Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--c-muted)]">
                                {r.town}, {r.district}
                                {r.updated_at && (
                                  <span className="ml-1.5 text-[var(--c-dim)]">
                                    · updated {new Date(r.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Link href={`/admin/restaurants/${r.id}/edit`}>
                                <Button size="sm" variant="secondary" className="text-xs"><Pencil size={12} /> Edit</Button>
                              </Link>
                              <Link href={`/restaurants/${r.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs">View</Button>
                              </Link>
                              <button
                                onClick={() => deleteRestaurant(r.id, r.name)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                title="Delete restaurant"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination
                        page={restPage}
                        totalPages={restTotalPages}
                        total={restTotal}
                        onPageChange={loadRestaurants}
                        loading={restsLoading}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── BOOST ────────────────────────────────────────────────── */}
            {tab === 'Boost' && (
              <div className="space-y-5 animate-fade-in">

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total restaurants', value: stats?.stats?.restaurants ?? restaurantOptions.length },
                    { label: 'Boosted (active)',   value: boostActiveCount },
                    { label: 'Expired boosts',     value: boostExpiredCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="card p-5">
                      <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-1">{label}</p>
                      <p className="font-display text-3xl font-black text-[var(--c-text)]">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Global plan selector */}
                <div className="card p-5 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[var(--c-text)] shrink-0">Quick-boost plan:</p>
                  {[{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: '90', label: '90 days' }].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setBoostPlan(p.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                        boostPlan === p.value
                          ? 'text-white border-transparent'
                          : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-amber-400/40'
                      }`}
                      style={boostPlan === p.value ? { background: 'linear-gradient(135deg,#F59E0B,#EF4444)' } : {}}
                    >
                      {p.label}
                    </button>
                  ))}
                  {boostMsg && (
                    <p className={`text-sm font-semibold ml-auto ${boostMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                      {boostMsg}
                    </p>
                  )}
                </div>

                {/* Per-restaurant boost list */}
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h3 className="font-semibold text-[var(--c-text)]">
                      Manage restaurant boosts
                      {restTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({restTotal})</span>}
                    </h3>
                  </div>

                  {restsLoading ? <TabSpinner /> : restaurants.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-10">No restaurants found.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-[var(--c-border)]">
                        {restaurants.map(r => {
                          const active  = isBoostActive(r)
                          const expired = r.is_boosted && r.boost_expires_at && new Date(r.boost_expires_at) <= new Date()
                          return (
                            <Fragment key={r.id}>
                              <div className="flex items-center gap-4 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                                    {active && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                        <Zap size={8} className="fill-white" /> Featured
                                      </span>
                                    )}
                                    {expired && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400 shrink-0">
                                        Expired
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--c-muted)]">
                                    {r.town}, {r.district}
                                    {active && r.boost_expires_at && (
                                      <> · expires {new Date(r.boost_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {active ? (
                                    <button
                                      onClick={() => quickBoost(r.id, false, boostPlan)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                    >
                                      <ZapOff size={12} /> Remove
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => quickBoost(r.id, true, boostPlan)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                                      style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}
                                    >
                                      <Zap size={12} className="fill-white" /> Boost {boostPlan}d
                                    </button>
                                  )}
                                  <button
                                    onClick={() => loadBoostHistory(r.id)}
                                    className={clsx('p-1.5 rounded-lg transition-colors', historyOpenId === r.id ? 'bg-amber-50 text-amber-600' : 'hover:bg-surface-secondary text-[var(--c-muted)]')}
                                    title="Boost history"
                                  >
                                    <History size={13} />
                                  </button>
                                  <Link href={`/admin/restaurants/${r.id}/edit`}>
                                    <button className="p-1.5 rounded-lg hover:bg-surface-secondary text-[var(--c-muted)] transition-colors">
                                      <Pencil size={13} />
                                    </button>
                                  </Link>
                                </div>
                              </div>

                              {/* Inline boost history */}
                              {historyOpenId === r.id && (
                                <div className="mx-4 mb-3 rounded-xl border border-amber-100 bg-amber-50/50 overflow-hidden">
                                  <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-2">
                                    <History size={12} className="text-amber-600" />
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Boost history — {r.name}</p>
                                  </div>
                                  {historyLoading ? (
                                    <div className="flex justify-center py-6"><Spinner size={20} /></div>
                                  ) : (boostHistoryMap[r.id] || []).length === 0 ? (
                                    <p className="text-xs text-[var(--c-muted)] text-center py-5">No boost history yet.</p>
                                  ) : (
                                    <div className="divide-y divide-amber-100">
                                      {(boostHistoryMap[r.id] || []).map(h => (
                                        <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            {h.action === 'enabled' ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                                                <Zap size={8} className="fill-white" /> Boosted
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600">
                                                <ZapOff size={8} /> Removed
                                              </span>
                                            )}
                                            {h.plan && <span className="text-xs text-amber-700 font-medium">{h.plan} days</span>}
                                            {h.expires_at && h.action === 'enabled' && (
                                              <span className="text-xs text-[var(--c-muted)]">
                                                → {new Date(h.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[11px] text-[var(--c-dim)] shrink-0">
                                            {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Fragment>
                          )
                        })}
                      </div>
                      <Pagination
                        page={restPage}
                        totalPages={restTotalPages}
                        total={restTotal}
                        onPageChange={loadRestaurants}
                        loading={restsLoading}
                      />
                    </>
                  )}
                </div>

                <p className="text-xs text-[var(--c-dim)] text-center">
                  Collect payment from the restaurant owner first, then activate their boost here.
                </p>
              </div>
            )}

            {/* ── REVIEWS ──────────────────────────────────────────────── */}
            {tab === 'Reviews' && (
              <div className="card overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-[var(--c-border)]">
                  <h3 className="font-semibold text-[var(--c-text)]">
                    All reviews
                    {revTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({revTotal})</span>}
                  </h3>
                </div>

                {revsLoading ? <TabSpinner /> : reviews.length === 0 ? (
                  <p className="text-sm text-[var(--c-muted)] text-center py-10">No reviews yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-[var(--c-border)]">
                      {reviews.map(r => (
                        <div key={r.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-amber-600">{'★'.repeat(r.rating)}</span>
                                <span className="text-xs text-[var(--c-muted)]">by {r.profiles?.name}</span>
                                <span className="text-xs text-[var(--c-muted)]">→ {r.restaurants?.name}</span>
                                {!r.is_approved && (
                                  <Badge color="amber" className="text-[10px]">Pending</Badge>
                                )}
                              </div>
                              {r.comment && <p className="text-sm text-[var(--c-text)] truncate">{r.comment}</p>}
                              <p className="text-xs text-[var(--c-dim)] mt-0.5">
                                {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!r.is_approved ? (
                                <button
                                  onClick={() => approveReview(r.id, true)}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                  title="Approve"
                                >
                                  <Check size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => approveReview(r.id, false)}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                                  title="Unapprove"
                                >
                                  <X size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteReview(r.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      page={revPage}
                      totalPages={revTotalPages}
                      total={revTotal}
                      onPageChange={loadReviews}
                      loading={revsLoading}
                    />
                  </>
                )}
              </div>
            )}

            {/* ── USERS ────────────────────────────────────────────────── */}
            {tab === 'Users' && (
              <div className="card overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-[var(--c-border)]">
                  <h3 className="font-semibold text-[var(--c-text)]">
                    All users
                    {usersTotal > 0 && <span className="ml-1 font-normal text-[var(--c-muted)]">({usersTotal})</span>}
                  </h3>
                </div>

                {usrsLoading ? <TabSpinner /> : users.length === 0 ? (
                  <p className="text-sm text-[var(--c-muted)] text-center py-10">No users yet.</p>
                ) : (
                  <>
                    <div className="divide-y divide-[var(--c-border)]">
                      {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={u.name || 'User'} size={32} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--c-text)] truncate">{u.name || 'Unnamed'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge color={u.role === 'admin' ? 'amber' : 'gray'} className="text-[10px]">{u.role}</Badge>
                                {u.is_banned && <Badge color="red" className="text-[10px]">Banned</Badge>}
                                <span className="text-[10px] text-[var(--c-dim)]">
                                  joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBan(u.id, u.is_banned)}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0',
                              u.is_banned
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100',
                            )}
                          >
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      page={usersPage}
                      totalPages={usersTotalPages}
                      total={usersTotal}
                      onPageChange={loadUsers}
                      loading={usrsLoading}
                    />
                  </>
                )}
              </div>
            )}

            {/* ── MENU ITEMS ───────────────────────────────────────────── */}
            {tab === 'Menu Items' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-3 flex items-center gap-2">
                    <Tag size={17} /> Visual Menu Items
                  </h3>
                  <select
                    value={miRestaurant}
                    onChange={e => { setMiRestaurant(e.target.value); loadMenuItems(e.target.value); miReset() }}
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                  >
                    <option value="">— Select restaurant —</option>
                    {restaurantOptions.map(r => (
                      <option key={r.id} value={r.id}>{r.name} — {r.town}</option>
                    ))}
                  </select>
                </div>

                {miRestaurant && (
                  <>
                    <div className="card p-5">
                      <h4 className="font-semibold text-[var(--c-text)] mb-4">{miEditId ? 'Edit item' : 'Add new item'}</h4>
                      <form onSubmit={miSave} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Item name *</label>
                            <input
                              value={miForm.name}
                              onChange={e => setMiForm(f => ({ ...f, name: e.target.value }))}
                              required placeholder="e.g. Margherita Pizza"
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Price (LKR) *</label>
                            <input
                              type="number" step="0.01"
                              value={miForm.price}
                              onChange={e => setMiForm(f => ({ ...f, price: e.target.value }))}
                              required placeholder="950.00"
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Description</label>
                          <input
                            value={miForm.description}
                            onChange={e => setMiForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Short description of the dish"
                            className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Category</label>
                            <select
                              value={miForm.category}
                              onChange={e => setMiForm(f => ({ ...f, category: e.target.value }))}
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                            >
                              <option value="">— Select —</option>
                              {[
                                'Starters','Soups','Salads','Main Course','Rice & Noodles',
                                'Kottu','Roti & Hoppers','Grills & BBQ','Seafood','Vegetarian',
                                'Sandwiches & Burgers','Pizza & Pasta','Sides','Desserts',
                                'Beverages','Juices & Smoothies','Short Eats','Bakery & Pastries',
                                'Kids Menu','Specials',
                              ].map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount type</label>
                            <select
                              value={miForm.discount_type}
                              onChange={e => setMiForm(f => ({ ...f, discount_type: e.target.value }))}
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                            >
                              <option value="">None</option>
                              <option value="percent">Percent (%)</option>
                              <option value="fixed">Fixed (LKR)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount value</label>
                            <input
                              type="number" step="0.01"
                              value={miForm.discount_value}
                              onChange={e => setMiForm(f => ({ ...f, discount_value: e.target.value }))}
                              placeholder="e.g. 20"
                              disabled={!miForm.discount_type}
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white disabled:opacity-40"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Photo (optional)</label>
                          <input
                            type="file" accept="image/*"
                            onChange={e => setMiForm(f => ({ ...f, photo: e.target.files[0] }))}
                            className="w-full text-sm text-[var(--c-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FF2D55]/10 file:text-[#FF2D55] hover:file:bg-[#FF2D55]/20"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="submit" disabled={miSaving}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                          >
                            {miSaving ? 'Saving…' : miEditId ? 'Update item' : 'Add item'}
                          </button>
                          {miEditId && (
                            <button
                              type="button" onClick={miReset}
                              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary transition-all"
                            >
                              Cancel
                            </button>
                          )}
                          {miMsg && (
                            <p className={`text-sm font-medium ${miMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{miMsg}</p>
                          )}
                        </div>
                      </form>
                    </div>

                    <div className="card overflow-hidden">
                      <div className="p-4 border-b border-[var(--c-border)]">
                        <h4 className="font-semibold text-[var(--c-text)]">Items ({menuItems.length})</h4>
                      </div>
                      {miLoading ? (
                        <div className="flex justify-center py-12"><Spinner size={28} /></div>
                      ) : menuItems.length === 0 ? (
                        <p className="text-sm text-[var(--c-muted)] text-center py-8">No items yet</p>
                      ) : (
                        <div className="divide-y divide-[var(--c-border)]">
                          {menuItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                              {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--c-border)]" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                  <Image size={20} className="text-[var(--c-dim)]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-[var(--c-text)] truncate">{item.name}</p>
                                <p className="text-xs text-[var(--c-muted)]">
                                  Rs {Number(item.price).toFixed(2)}
                                  {item.category ? ` · ${item.category}` : ''}
                                  {item.discount_type ? ` · ${item.discount_value}${item.discount_type === 'percent' ? '%' : ' LKR'} OFF` : ''}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => miStartEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil size={14} /></button>
                                <button onClick={() => miDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── SITE CONTENT ─────────────────────────────────────────── */}
            {tab === 'Site Content' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                    <FileText size={17} /> Page Content Editor
                  </h3>
                  <div className="flex gap-2 mb-6">
                    {['home', 'about', 'contact'].map(p => (
                      <button
                        key={p}
                        onClick={() => { setScPage(p); scLoad(p) }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                          scPage === p ? 'text-white shadow-sm' : 'text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary'
                        }`}
                        style={scPage === p ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {scLoading ? <div className="flex justify-center py-8"><Spinner size={24} /></div> : (
                    <form onSubmit={scSave} className="space-y-4">
                      {(SC_SCHEMAS[scPage] || []).map(field => (
                        <div key={field}>
                          <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 capitalize">
                            {field.replace(/([A-Z])/g, ' $1')}
                          </label>
                          {field.startsWith('story') || field === 'subheadline' ? (
                            <textarea
                              rows={3}
                              value={scFields[field] || ''}
                              onChange={e => setScFields(f => ({ ...f, [field]: e.target.value }))}
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white resize-none"
                            />
                          ) : (
                            <input
                              value={scFields[field] || ''}
                              onChange={e => setScFields(f => ({ ...f, [field]: e.target.value }))}
                              className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"
                            />
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="submit" disabled={scSaving}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                        >
                          {scSaving ? 'Saving…' : 'Save changes'}
                        </button>
                        {scMsg && (
                          <p className={`text-sm font-medium ${scMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{scMsg}</p>
                        )}
                      </div>
                    </form>
                  )}
                </div>
                <p className="text-xs text-[var(--c-dim)] text-center">Changes appear live on the website immediately after saving.</p>
              </div>
            )}

            {/* ── HISTORY ──────────────────────────────────────────────── */}
            {tab === 'History' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--c-text)] flex items-center gap-2">
                    <Clock size={17} /> Activity History
                    {logsTotal > 0 && <span className="font-normal text-[var(--c-muted)] text-base">({logsTotal})</span>}
                  </h3>
                  <button
                    onClick={() => loadAuditLogs(logsPage)}
                    disabled={auditLoading}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--c-border)] hover:bg-surface-secondary transition-all disabled:opacity-50"
                  >
                    {auditLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {auditLoading ? (
                  <div className="flex justify-center py-16"><Spinner size={28} /></div>
                ) : auditLogs.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Clock size={32} className="mx-auto mb-3 text-[var(--c-dim)]" />
                    <p className="text-[var(--c-muted)] text-sm">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-[var(--c-border)]">
                      {auditLogs.map(log => {
                        const actionColors = {
                          'menu_item.create':           'bg-green-50 text-green-700',
                          'menu_item.update':           'bg-blue-50 text-blue-700',
                          'menu_item.delete':           'bg-red-50 text-red-600',
                          'menu.upload':                'bg-purple-50 text-purple-700',
                          'review.delete':              'bg-red-50 text-red-600',
                          'review.approve':             'bg-green-50 text-green-700',
                          'review.unapprove':           'bg-amber-50 text-amber-700',
                          'review.flag':                'bg-amber-50 text-amber-700',
                          'user.ban':                   'bg-red-50 text-red-600',
                          'user.unban':                 'bg-green-50 text-green-700',
                          'user.role_change':           'bg-blue-50 text-blue-700',
                          'site_content.update':        'bg-purple-50 text-purple-700',
                          'restaurant.boost.enable':    'bg-amber-50 text-amber-700',
                          'restaurant.boost.remove':    'bg-gray-50 text-gray-600',
                          'restaurant.create':          'bg-green-50 text-green-700',
                        }
                        const color = actionColors[log.action] || 'bg-gray-50 text-gray-600'
                        return (
                          <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-secondary transition-colors">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${color}`}>
                              {log.action}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--c-text)] truncate font-medium">{log.target}</p>
                              <p className="text-xs text-[var(--c-muted)]">by {log.profiles?.name || 'Admin'}</p>
                            </div>
                            <p className="text-xs text-[var(--c-dim)] shrink-0">
                              {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    <Pagination
                      page={logsPage}
                      totalPages={logsTotalPages}
                      total={logsTotal}
                      onPageChange={loadAuditLogs}
                      loading={auditLoading}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="h-20 lg:h-8" />
          </main>
        </div>
      </div>
    </>
  )
}
