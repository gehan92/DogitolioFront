'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, UtensilsCrossed, MessageSquare, Users, Upload, Plus, Check, X, Trash2, Shield, Image, FileText, ChevronDown, Pencil, Tag } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import clsx from 'clsx'

const TABS = ['Overview', 'Restaurants', 'Reviews', 'Users', 'Menu Items', 'Site Content']

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, token } = useAuth()
  const router = useRouter()

  const [tab,         setTab]         = useState('Overview')
  const [stats,       setStats]       = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [reviews,     setReviews]     = useState([])
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)

  // Upload state
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [pdfFile,   setPdfFile]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  // Menu Items state
  const [miRestaurant, setMiRestaurant] = useState('')
  const [menuItems,    setMenuItems]    = useState([])
  const [miLoading,    setMiLoading]    = useState(false)
  const [miForm, setMiForm] = useState({ name:'', description:'', price:'', category:'', discount_type:'', discount_value:'', photo: null })
  const [miEditId, setMiEditId] = useState(null)
  const [miSaving, setMiSaving] = useState(false)
  const [miMsg,    setMiMsg]    = useState('')

  // Site Content state
  const [scPage,    setScPage]    = useState('home')
  const [scFields,  setScFields]  = useState({})
  const [scLoading, setScLoading] = useState(false)
  const [scSaving,  setScSaving]  = useState(false)
  const [scMsg,     setScMsg]     = useState('')

  const SC_SCHEMAS = {
    home:    ['headline','subheadline','ctaText'],
    about:   ['headline','subheadline','storyTitle','storyP1','storyP2'],
    contact: ['headline','subheadline','email','phone','location','hours'],
  }

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isAdmin, authLoading])

  useEffect(() => {
    if (!token || !isAdmin) return
    loadData()
  }, [token, isAdmin])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, restsData, revsData, usrsData] = await Promise.all([
        api.admin.stats(token),
        api.restaurants.list({ limit: 50 }),
        api.admin.reviews({}, token),
        api.admin.users({}, token),
      ])
      setStats(statsData)
      setRestaurants(restsData.data || [])
      setReviews(revsData.data || [])
      setUsers(usrsData.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!selectedRestaurant || !pdfFile) return
    setUploading(true)
    setUploadMsg('')
    try {
      const form = new FormData()
      form.append('menu', pdfFile)
      const result = await api.menus.upload(selectedRestaurant, form, token)
      setUploadMsg(`✓ Menu uploaded — version ${result.version}`)
      setPdfFile(null)
      setSelectedRestaurant('')
    } catch (err) {
      setUploadMsg(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function toggleBan(userId, isBanned) {
    await api.admin.patchUser(userId, { is_banned: !isBanned }, token)
    setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_banned: !isBanned } : usr))
  }

  async function deleteReview(reviewId) {
    if (!confirm('Delete this review?')) return
    await api.admin.deleteReview(reviewId, token)
    setReviews(r => r.filter(rev => rev.id !== reviewId))
  }

  async function approveReview(reviewId, approve) {
    await api.admin.patchReview(reviewId, { is_approved: approve }, token)
    setReviews(r => r.map(rev => rev.id === reviewId ? { ...rev, is_approved: approve } : rev))
  }

  // ── Menu Items handlers ─────────────────────────────────────────
  async function loadMenuItems(restaurantId) {
    if (!restaurantId) return
    setMiLoading(true)
    try {
      const data = await api.menuItems.list(restaurantId)
      setMenuItems(data || [])
    } catch { setMenuItems([]) }
    finally { setMiLoading(false) }
  }

  function miStartEdit(item) {
    setMiEditId(item.id)
    setMiForm({ name: item.name, description: item.description||'', price: item.price, category: item.category||'', discount_type: item.discount_type||'', discount_value: item.discount_value||'', photo: null })
  }

  function miReset() {
    setMiEditId(null)
    setMiForm({ name:'', description:'', price:'', category:'', discount_type:'', discount_value:'', photo: null })
    setMiMsg('')
  }

  async function miSave(e) {
    e.preventDefault()
    if (!miRestaurant) return
    setMiSaving(true); setMiMsg('')
    try {
      const fd = new FormData()
      fd.append('name',          miForm.name)
      fd.append('description',   miForm.description)
      fd.append('price',         miForm.price)
      fd.append('category',      miForm.category)
      fd.append('discount_type', miForm.discount_type)
      fd.append('discount_value',miForm.discount_value)
      if (miForm.photo) fd.append('photo', miForm.photo)

      if (miEditId) {
        const updated = await api.menuItems.update(miEditId, fd, token)
        setMenuItems(items => items.map(i => i.id === miEditId ? updated : i))
        setMiMsg('✓ Item updated')
      } else {
        const created = await api.menuItems.create(miRestaurant, fd, token)
        setMenuItems(items => [...items, created])
        setMiMsg('✓ Item added')
      }
      miReset()
    } catch (err) { setMiMsg(`Error: ${err.message}`) }
    finally { setMiSaving(false) }
  }

  async function miDelete(id) {
    if (!confirm('Delete this menu item?')) return
    await api.menuItems.delete(id, token)
    setMenuItems(items => items.filter(i => i.id !== id))
  }

  // ── Site Content handlers ────────────────────────────────────────
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

  if (authLoading || loading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Shield size={20} className="text-amber-700" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--c-muted)]">Manage restaurants, menus, reviews and users</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-2xl mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                tab === t ? 'bg-white text-[var(--c-text)] shadow-sm' : 'text-[var(--c-muted)] hover:text-[var(--c-text)]')}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW */}
        {tab === 'Overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Restaurants', value: stats?.stats?.restaurants, icon: UtensilsCrossed, color: 'brand' },
                { label: 'Reviews',     value: stats?.stats?.reviews,     icon: MessageSquare,   color: 'blue' },
                { label: 'Users',       value: stats?.stats?.users,       icon: Users,           color: 'green' },
                { label: 'Menus',       value: stats?.stats?.menus,       icon: Upload,          color: 'amber' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <p className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wide mb-1">{label}</p>
                  <p className="font-display text-3xl font-black text-[var(--c-text)]">{value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
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

        {/* ── RESTAURANTS + MENU UPLOAD */}
        {tab === 'Restaurants' && (
          <div className="space-y-5 animate-fade-in">

            {/* Upload menu */}
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2">
                <Upload size={18} className="text-brand-500" />
                Upload / replace menu PDF
              </h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Select restaurant</label>
                  <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} required
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white">
                    <option value="">— Choose restaurant —</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">PDF menu file</label>
                  <div className={clsx('border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                    pdfFile ? 'border-brand-400 bg-brand-50' : 'border-[var(--c-border2)] hover:border-brand-300')}>
                    <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0])}
                      className="hidden" id="pdf-upload" required />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      {pdfFile ? (
                        <div>
                          <p className="font-semibold text-brand-700">{pdfFile.name}</p>
                          <p className="text-xs text-brand-500 mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
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

            {/* Restaurant list */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
                <h3 className="font-semibold text-[var(--c-text)]">All restaurants ({restaurants.length})</h3>
                <Link href="/admin/restaurants/new"><Button size="sm" variant="secondary"><Plus size={14}/> Add new</Button></Link>
              </div>
              <div className="divide-y divide-[var(--c-border)]">
                {restaurants.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[var(--c-text)] truncate">{r.name}</p>
                      <p className="text-xs text-[var(--c-muted)]">{r.town}, {r.district}</p>
                    </div>
                    <Link href={`/restaurants/${r.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── REVIEWS */}
        {tab === 'Reviews' && (
          <div className="card overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--c-border)]">
              <h3 className="font-semibold text-[var(--c-text)]">All reviews ({reviews.length})</h3>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {reviews.map(r => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-amber-600">{'★'.repeat(r.rating)}</span>
                        <span className="text-xs text-[var(--c-muted)]">by {r.profiles?.name}</span>
                        <span className="text-xs text-[var(--c-muted)]">→ {r.restaurants?.name}</span>
                      </div>
                      {r.comment && <p className="text-sm text-[var(--c-text)] truncate">{r.comment}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!r.is_approved ? (
                        <button onClick={() => approveReview(r.id, true)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Approve">
                          <Check size={15} />
                        </button>
                      ) : (
                        <button onClick={() => approveReview(r.id, false)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Unapprove">
                          <X size={15} />
                        </button>
                      )}
                      <button onClick={() => deleteReview(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS */}
        {tab === 'Users' && (
          <div className="card overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--c-border)]">
              <h3 className="font-semibold text-[var(--c-text)]">All users ({users.length})</h3>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name || 'User'} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)] truncate">{u.name || 'Unnamed'}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge color={u.role === 'admin' ? 'amber' : 'gray'} className="text-[10px]">{u.role}</Badge>
                        {u.is_banned && <Badge color="red" className="text-[10px]">Banned</Badge>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleBan(u.id, u.is_banned)}
                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      u.is_banned ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100')}>
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MENU ITEMS */}
        {tab === 'Menu Items' && (
          <div className="space-y-5 animate-fade-in">
            {/* Restaurant selector */}
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--c-text)] mb-3 flex items-center gap-2"><Tag size={17}/> Visual Menu Items</h3>
              <select value={miRestaurant} onChange={e => { setMiRestaurant(e.target.value); loadMenuItems(e.target.value); miReset() }}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white">
                <option value="">— Select restaurant —</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name} — {r.town}</option>)}
              </select>
            </div>

            {miRestaurant && (
              <>
                {/* Add / Edit form */}
                <div className="card p-5">
                  <h4 className="font-semibold text-[var(--c-text)] mb-4">{miEditId ? 'Edit item' : 'Add new item'}</h4>
                  <form onSubmit={miSave} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Item name *</label>
                        <input value={miForm.name} onChange={e => setMiForm(f=>({...f,name:e.target.value}))} required
                          placeholder="e.g. Margherita Pizza"
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Price (LKR) *</label>
                        <input type="number" step="0.01" value={miForm.price} onChange={e => setMiForm(f=>({...f,price:e.target.value}))} required
                          placeholder="950.00"
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Description</label>
                      <input value={miForm.description} onChange={e => setMiForm(f=>({...f,description:e.target.value}))}
                        placeholder="Short description of the dish"
                        className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Category</label>
                        <input value={miForm.category} onChange={e => setMiForm(f=>({...f,category:e.target.value}))}
                          placeholder="e.g. Main Course"
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount type</label>
                        <select value={miForm.discount_type} onChange={e => setMiForm(f=>({...f,discount_type:e.target.value}))}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white">
                          <option value="">None</option>
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed (LKR)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Discount value</label>
                        <input type="number" step="0.01" value={miForm.discount_value} onChange={e => setMiForm(f=>({...f,discount_value:e.target.value}))}
                          placeholder="e.g. 20"
                          disabled={!miForm.discount_type}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white disabled:opacity-40"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1">Photo (optional)</label>
                      <input type="file" accept="image/*" onChange={e => setMiForm(f=>({...f,photo:e.target.files[0]}))}
                        className="w-full text-sm text-[var(--c-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FF2D55]/10 file:text-[#FF2D55] hover:file:bg-[#FF2D55]/20"/>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button type="submit" disabled={miSaving}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                        {miSaving ? 'Saving…' : miEditId ? 'Update item' : 'Add item'}
                      </button>
                      {miEditId && (
                        <button type="button" onClick={miReset} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary transition-all">
                          Cancel
                        </button>
                      )}
                      {miMsg && <p className={`text-sm font-medium ${miMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{miMsg}</p>}
                    </div>
                  </form>
                </div>

                {/* Items list */}
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--c-border)]">
                    <h4 className="font-semibold text-[var(--c-text)]">Items ({menuItems.length})</h4>
                  </div>
                  {miLoading ? (
                    <div className="flex justify-center py-12"><Spinner size={28}/></div>
                  ) : menuItems.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)] text-center py-8">No items yet</p>
                  ) : (
                    <div className="divide-y divide-[var(--c-border)]">
                      {menuItems.map(item => (
                        <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--c-border)]"/>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#f0f0f0] flex items-center justify-center shrink-0"><Image size={20} className="text-[var(--c-dim)]"/></div>
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
                            <button onClick={() => miStartEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil size={14}/></button>
                            <button onClick={() => miDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14}/></button>
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

        {/* ── SITE CONTENT */}
        {tab === 'Site Content' && (
          <div className="space-y-5 animate-fade-in">
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--c-text)] mb-4 flex items-center gap-2"><FileText size={17}/> Page Content Editor</h3>
              <div className="flex gap-2 mb-6">
                {['home','about','contact'].map(p => (
                  <button key={p} onClick={() => { setScPage(p); scLoad(p) }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${scPage === p ? 'text-white shadow-sm' : 'text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary'}`}
                    style={scPage === p ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}>
                    {p}
                  </button>
                ))}
              </div>

              {scLoading ? <div className="flex justify-center py-8"><Spinner size={24}/></div> : (
                <form onSubmit={scSave} className="space-y-4">
                  {(SC_SCHEMAS[scPage] || []).map(field => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 capitalize">{field.replace(/([A-Z])/g,' $1')}</label>
                      {field.startsWith('story') || field === 'subheadline' ? (
                        <textarea rows={3} value={scFields[field] || ''} onChange={e => setScFields(f=>({...f,[field]:e.target.value}))}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white resize-none"/>
                      ) : (
                        <input value={scFields[field] || ''} onChange={e => setScFields(f=>({...f,[field]:e.target.value}))}
                          className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white"/>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={scSaving}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                      {scSaving ? 'Saving…' : 'Save changes'}
                    </button>
                    {scMsg && <p className={`text-sm font-medium ${scMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{scMsg}</p>}
                  </div>
                </form>
              )}
            </div>
            <p className="text-xs text-[var(--c-dim)] text-center">Changes appear live on the website immediately after saving.</p>
          </div>
        )}

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
