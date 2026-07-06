'use client'
import { useState, useEffect } from 'react'
import { useRouter }            from 'next/navigation'
import Link                     from 'next/link'
import {
  Building2, Plus, ChevronDown, ChevronLeft, Clock,
  UtensilsCrossed, AlertCircle, Check, X, Send,
} from 'lucide-react'
import Navbar        from '@/components/layout/Navbar'
import { Spinner }   from '@/components/ui'
import { useAuth }   from '@/hooks/useAuth'
import { api }       from '@/lib/api'
import clsx          from 'clsx'

const REQUEST_TYPES = [
  { value: 'price_update', label: 'Price update',    desc: 'Change prices of food items' },
  { value: 'page_change',  label: 'Page change',     desc: 'Update restaurant page info (description, hours, contact)' },
  { value: 'menu_change',  label: 'Menu change',     desc: 'Add, remove, or modify menu items' },
  { value: 'other',        label: 'Other request',   desc: 'Any other changes you need' },
]

const STATUS_COLORS = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  approved: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  rejected: { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200',    dot: 'bg-red-500'    },
  paid:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  applied:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
}

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize', s.bg, s.text, s.border)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />
      {status}
    </span>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white transition-colors'

export default function OwnerPage() {
  const { user, profile, isOwner, loading: authLoading, token } = useAuth()
  const router = useRouter()

  const [loading,      setLoading]      = useState(true)
  const [myRestaurants,setMyRestaurants]= useState([])
  const [requests,     setRequests]     = useState([])
  const [reqTotal,     setReqTotal]     = useState(0)
  const [reqPage,      setReqPage]      = useState(1)
  const [reqLoading,   setReqLoading]   = useState(false)
  const [expandedId,   setExpandedId]   = useState(null)
  const [expandedData, setExpandedData] = useState({})

  // New request form
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ restaurant_id: '', type: '', title: '', description: '' })
  const [formSaving, setFormSaving] = useState(false)
  const [formMsg,    setFormMsg]    = useState('')

  // Status filter
  const [statusFilter, setStatusFilter] = useState('')

  // Menu availability
  const [expandedMenuId, setExpandedMenuId] = useState(null)
  const [menuItemsMap,   setMenuItemsMap]   = useState({}) // { restaurantId: items[] }
  const [menuLoading,    setMenuLoading]    = useState(false)
  const [availHistoryMap, setAvailHistoryMap] = useState({}) // { restaurantId: { items, page, totalPages, loading } }

  // Operating hours
  const [expandedHoursId, setExpandedHoursId] = useState(null)
  const [hoursSavingMap,   setHoursSavingMap] = useState({}) // { restaurantId: bool }
  const [hoursMsgMap,      setHoursMsgMap]    = useState({}) // { restaurantId: string }

  // Auth guard — owner only
  useEffect(() => {
    if (!authLoading && user && profile && !isOwner) router.replace('/')
    if (!authLoading && !user) router.replace('/auth')
  }, [user, profile, isOwner, authLoading])

  useEffect(() => {
    if (!token || !isOwner) return
    loadInitial()
  }, [token, isOwner])

  // Auto-select the restaurant when there is only one linked
  useEffect(() => {
    if (myRestaurants.length === 1 && !form.restaurant_id) {
      setForm(f => ({ ...f, restaurant_id: myRestaurants[0].id }))
    }
  }, [myRestaurants])

  async function loadInitial() {
    setLoading(true)
    try {
      const [meData, reqData] = await Promise.all([
        api.owner.me(token),
        api.owner.myRequests({}, token),
      ])
      setMyRestaurants((meData.restaurants || []).map(r => ({
        ...r,
        opening_time: r.opening_time ? r.opening_time.slice(0, 5) : '',
        closing_time: r.closing_time ? r.closing_time.slice(0, 5) : '',
      })))
      setRequests(reqData.data || [])
      setReqTotal(reqData.total ?? 0)
      setReqPage(1)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadAvailHistory(restaurantId, page = 1) {
    setAvailHistoryMap(m => ({ ...m, [restaurantId]: { items: [], totalPages: 1, ...m[restaurantId], loading: true } }))
    try {
      const data = await api.owner.availabilityHistory({ restaurant_id: restaurantId, page, limit: 5 }, token)
      setAvailHistoryMap(m => {
        const prevItems = page > 1 ? (m[restaurantId]?.items || []) : []
        return {
          ...m,
          [restaurantId]: {
            items: [...prevItems, ...(data.data || [])],
            page,
            totalPages: data.totalPages || 1,
            loading: false,
          },
        }
      })
    } catch (err) {
      console.error(err)
      setAvailHistoryMap(m => ({ ...m, [restaurantId]: { items: [], totalPages: 1, ...m[restaurantId], loading: false } }))
    }
  }

  async function loadRequests(page = 1, filter = statusFilter) {
    setReqLoading(true)
    try {
      const params = { page, limit: 12 }
      if (filter) params.status = filter
      const data = await api.owner.myRequests(params, token)
      setRequests(data.data || [])
      setReqTotal(data.total ?? 0)
      setReqPage(page)
    } catch (err) { console.error(err) }
    finally { setReqLoading(false) }
  }

  async function expandRequest(id) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (expandedData[id]) return
    try {
      const data = await api.owner.getRequest(id, token)
      setExpandedData(m => ({ ...m, [id]: data }))
    } catch (err) { console.error(err) }
  }

  function changeFilter(f) {
    setStatusFilter(f)
    loadRequests(1, f)
  }

  async function toggleMenuExpand(restaurantId) {
    if (expandedMenuId === restaurantId) { setExpandedMenuId(null); return }
    setExpandedMenuId(restaurantId)
    if (!menuItemsMap[restaurantId]) {
      setMenuLoading(true)
      try {
        const data = await api.menuItems.list(restaurantId)
        setMenuItemsMap(m => ({ ...m, [restaurantId]: data?.data || [] }))
      } catch (err) { console.error(err) }
      finally { setMenuLoading(false) }
    }
    if (!availHistoryMap[restaurantId]) loadAvailHistory(restaurantId, 1)
  }

  async function toggleItemAvailability(restaurantId, item) {
    const next = !(item.is_available ?? true)
    setMenuItemsMap(m => ({
      ...m,
      [restaurantId]: m[restaurantId].map(i => i.id === item.id ? { ...i, is_available: next } : i),
    }))
    try {
      await api.menuItems.setAvailability(item.id, next, token)
      loadAvailHistory(restaurantId, 1)
    } catch (err) {
      setMenuItemsMap(m => ({
        ...m,
        [restaurantId]: m[restaurantId].map(i => i.id === item.id ? { ...i, is_available: !next } : i),
      }))
      alert(err.message)
    }
  }

  function setHoursField(restaurantId, field, value) {
    setMyRestaurants(rs => rs.map(r => r.id === restaurantId ? { ...r, [field]: value } : r))
  }

  async function saveHours(restaurantId) {
    const r = myRestaurants.find(x => x.id === restaurantId)
    setHoursSavingMap(m => ({ ...m, [restaurantId]: true }))
    setHoursMsgMap(m => ({ ...m, [restaurantId]: '' }))
    try {
      const updated = await api.restaurants.setHours(restaurantId, {
        opening_time:       r.opening_time || null,
        closing_time:       r.closing_time || null,
        is_closed_override: r.is_closed_override || false,
      }, token)
      setMyRestaurants(rs => rs.map(x => x.id === restaurantId ? {
        ...x,
        opening_time:       updated.opening_time ? updated.opening_time.slice(0, 5) : '',
        closing_time:       updated.closing_time ? updated.closing_time.slice(0, 5) : '',
        is_closed_override: updated.is_closed_override || false,
      } : x))
      setHoursMsgMap(m => ({ ...m, [restaurantId]: '✓ Saved — updates the public page instantly.' }))
    } catch (err) {
      setHoursMsgMap(m => ({ ...m, [restaurantId]: `Error: ${err.message}` }))
    } finally {
      setHoursSavingMap(m => ({ ...m, [restaurantId]: false }))
    }
  }

  async function submitRequest(e) {
    e.preventDefault()
    if (!form.restaurant_id || !form.type || !form.title || !form.description) return
    setFormSaving(true); setFormMsg('')
    try {
      const data = await api.owner.createRequest(form, token)
      setRequests(r => [data, ...r])
      setReqTotal(t => t + 1)
      setForm({ restaurant_id: '', type: '', title: '', description: '' })
      setShowForm(false)
      setFormMsg('✓ Request submitted successfully')
      setTimeout(() => setFormMsg(''), 4000)
    } catch (err) { setFormMsg(`Error: ${err.message}`) }
    finally { setFormSaving(false) }
  }

  if (authLoading || loading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <>
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={20} className="text-[#FF2D55]" />
              <h1 className="font-bold text-xl text-gray-900">My Restaurants</h1>
            </div>
            <p className="text-sm text-gray-500">
              Welcome, <span className="font-semibold text-gray-700">{profile?.name}</span>.
              Manage your restaurant listings and submit change requests to the admin.
            </p>
          </div>
          <Link href="/" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <ChevronLeft size={13} /> Back to site
          </Link>
        </div>

        {/* ── Linked restaurants */}
        {myRestaurants.length > 0 ? (
          <div className="space-y-3">
            {myRestaurants.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <UtensilsCrossed size={24} className="text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.town}, {r.district}</p>
                  </div>
                  <button
                    onClick={() => toggleMenuExpand(r.id)}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      expandedMenuId === r.id ? 'border-[#FF2D55]/40 text-[#FF2D55] bg-red-50/30' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    Today&apos;s availability
                    <ChevronDown size={12} className={clsx('transition-transform', expandedMenuId === r.id && 'rotate-180')} />
                  </button>
                  <button
                    onClick={() => setExpandedHoursId(id => id === r.id ? null : r.id)}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      expandedHoursId === r.id ? 'border-[#FF2D55]/40 text-[#FF2D55] bg-red-50/30' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    Hours
                    <ChevronDown size={12} className={clsx('transition-transform', expandedHoursId === r.id && 'rotate-180')} />
                  </button>
                  <Link href={`/restaurants/${r.id}`}>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                      View
                    </button>
                  </Link>
                </div>

                {expandedMenuId === r.id && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Toggle items off when they&apos;re sold out today — this updates your public menu instantly, no approval needed.
                    </p>
                    {menuLoading && !menuItemsMap[r.id] ? (
                      <div className="flex justify-center py-6"><Spinner size={22} /></div>
                    ) : (menuItemsMap[r.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No menu items yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {menuItemsMap[r.id].map(item => {
                          const isAvailable = item.is_available ?? true
                          return (
                            <div key={item.id} className={clsx('flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5', !isAvailable && 'opacity-60')}>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {item.name}
                                  {!isAvailable && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Sold out</span>}
                                </p>
                                {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleItemAvailability(r.id, item)}
                                className={clsx(
                                  'w-10 h-5 rounded-full transition-all relative shrink-0',
                                  isAvailable ? 'bg-green-500' : 'bg-gray-200'
                                )}
                              >
                                <span className={clsx(
                                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                                  isAvailable ? 'right-0.5' : 'left-0.5'
                                )} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Recent activity — who changed availability, and when */}
                    {availHistoryMap[r.id]?.items?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent activity</p>
                        <div className="space-y-1.5">
                          {availHistoryMap[r.id].items.map(h => (
                            <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500">
                              <span className={clsx(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0',
                                h.meta?.is_available !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                              )}>
                                {h.meta?.is_available !== false ? 'Available' : 'Sold out'}
                              </span>
                              <span className="truncate">{h.target}</span>
                              <span className="text-gray-300 shrink-0">·</span>
                              <span className="shrink-0">by {h.profiles?.name || 'Unknown'}</span>
                              <span className="text-gray-400 shrink-0 ml-auto">
                                {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                        {availHistoryMap[r.id].page < availHistoryMap[r.id].totalPages && (
                          <button
                            onClick={() => loadAvailHistory(r.id, availHistoryMap[r.id].page + 1)}
                            disabled={availHistoryMap[r.id].loading}
                            className="mt-2 text-xs font-semibold text-[#FF2D55] hover:underline disabled:opacity-50"
                          >
                            {availHistoryMap[r.id].loading ? 'Loading…' : 'Load more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {expandedHoursId === r.id && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-4 space-y-4">
                    <p className="text-xs text-gray-500">
                      Same hours apply every day. Updates the public page instantly — no approval needed.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Opening time</label>
                        <input
                          type="time"
                          value={r.opening_time || ''}
                          onChange={e => setHoursField(r.id, 'opening_time', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Closing time</label>
                        <input
                          type="time"
                          value={r.closing_time || ''}
                          onChange={e => setHoursField(r.id, 'closing_time', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                      <input
                        type="checkbox"
                        checked={!!r.is_closed_override}
                        onChange={e => setHoursField(r.id, 'is_closed_override', e.target.checked)}
                        className="accent-[#FF2D55]"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        Temporarily closed
                        {r.is_closed_override && <span className="text-red-500"> (overrides hours — always shows Closed)</span>}
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveHours(r.id)}
                        disabled={hoursSavingMap[r.id]}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                      >
                        <Check size={14} /> {hoursSavingMap[r.id] ? 'Saving…' : 'Save Hours'}
                      </button>
                      {hoursMsgMap[r.id] && (
                        <p className={clsx('text-xs font-semibold', hoursMsgMap[r.id].startsWith('✓') ? 'text-green-700' : 'text-red-600')}>
                          {hoursMsgMap[r.id]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <UtensilsCrossed size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No restaurants linked to your account yet.</p>
            <p className="text-xs text-gray-400 mt-1">Contact the admin to get your restaurant assigned.</p>
          </div>
        )}

        {/* ── Change requests section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900">Change Requests</h2>
              {reqTotal > 0 && (
                <span className="text-xs text-gray-400 font-normal">({reqTotal})</span>
              )}
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingCount} pending
                </span>
              )}
            </div>
            {myRestaurants.length > 0 && (
              <button
                onClick={() => { setShowForm(f => !f); setFormMsg('') }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
              >
                {showForm ? <X size={14} /> : <Plus size={14} />}
                {showForm ? 'Cancel' : 'New request'}
              </button>
            )}
          </div>

          {/* How it works */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 mb-2">How it works</p>
            <div className="flex items-center gap-2 flex-wrap text-xs text-blue-600">
              {['Submit request', 'Admin reviews', 'Approved & paid', 'Admin applies changes'].map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-blue-300">→</span>}
                  <span className="bg-white border border-blue-100 px-2 py-0.5 rounded-full font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New request form */}
          {showForm && myRestaurants.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">Submit a change request</h3>
              <form onSubmit={submitRequest} className="space-y-4">

                {/* Restaurant select (only if more than one) */}
                {myRestaurants.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Restaurant</label>
                    <select value={form.restaurant_id} onChange={e => setForm(f => ({ ...f, restaurant_id: e.target.value }))} required className={inputCls}>
                      <option value="">— Select your restaurant —</option>
                      {myRestaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Request type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Type of change</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REQUEST_TYPES.map(t => (
                      <label
                        key={t.value}
                        className={clsx(
                          'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                          form.type === t.value ? 'border-[#FF2D55]/40 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="radio" name="type" value={t.value} required
                          checked={form.type === t.value}
                          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                          className="mt-0.5 accent-[#FF2D55] shrink-0"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                          <p className="text-xs text-gray-500">{t.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Request title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required placeholder="e.g. Update price of Fish Kottu to Rs 850"
                    maxLength={200}
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required rows={4}
                    placeholder="Describe exactly what changes you need. Be as specific as possible."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit" disabled={formSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}
                  >
                    <Send size={14} /> {formSaving ? 'Submitting…' : 'Submit request'}
                  </button>
                  {formMsg && (
                    <p className={clsx('text-sm font-medium', formMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600')}>{formMsg}</p>
                  )}
                </div>
              </form>
            </div>
          )}

          {formMsg && !showForm && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
              <Check size={15} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">{formMsg}</p>
            </div>
          )}

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: '',         label: 'All' },
              { value: 'pending',  label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'paid',     label: 'Paid' },
              { value: 'applied',  label: 'Applied' },
              { value: 'rejected', label: 'Rejected' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => changeFilter(f.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  statusFilter === f.value
                    ? 'text-white border-transparent'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                )}
                style={statusFilter === f.value ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Requests list */}
          {reqLoading ? (
            <div className="flex justify-center py-10"><Spinner size={28} /></div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <AlertCircle size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No requests yet.</p>
              {myRestaurants.length > 0 && <p className="text-xs text-gray-400 mt-1">Click &quot;New request&quot; to submit your first one.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => expandRequest(req.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <StatusPill status={req.status} />
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                            {req.type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">{req.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {req.restaurants?.name && <> · {req.restaurants.name}</>}
                        </p>
                      </div>
                      <ChevronDown
                        size={15}
                        className={clsx('text-gray-400 shrink-0 mt-1 transition-transform', expandedId === req.id && 'rotate-180')}
                      />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === req.id && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/40">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your request</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>
                      </div>

                      {req.admin_note && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-0.5">Admin response</p>
                          <p className="text-sm text-blue-800">{req.admin_note}</p>
                        </div>
                      )}

                      {/* Status timeline */}
                      {expandedData[req.id]?.history?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status timeline</p>
                          <div className="space-y-1.5">
                            {expandedData[req.id].history.map((h, i) => (
                              <div key={h.id} className="flex items-center gap-2 text-xs">
                                <StatusPill status={h.to_status} />
                                {h.note && <span className="text-gray-500 truncate">{h.note}</span>}
                                <span className="text-gray-400 shrink-0 ml-auto">
                                  {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next step guidance */}
                      {req.status === 'pending' && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                          <strong>Waiting for admin review.</strong> You will be notified when your request is approved or rejected.
                        </div>
                      )}
                      {req.status === 'approved' && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
                          <strong>Request approved!</strong> Please contact the admin to arrange payment to proceed.
                        </div>
                      )}
                      {req.status === 'paid' && (
                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-700">
                          <strong>Payment confirmed.</strong> The admin will apply your changes shortly.
                        </div>
                      )}
                      {req.status === 'applied' && (
                        <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-xs text-green-700 flex items-center gap-2">
                          <Check size={14} className="shrink-0" />
                          <strong>Done! Your changes have been applied.</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </>
  )
}
