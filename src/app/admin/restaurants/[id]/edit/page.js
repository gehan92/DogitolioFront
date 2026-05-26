'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed, ImagePlus, X, Zap, ZapOff, CheckCircle2, Clock, History } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Spinner, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const PROVINCES = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa',
]

const PRICE_RANGES = ['budget', 'mid', 'upscale']

const CUISINE_OPTIONS = [
  'Sri Lankan', 'Chinese', 'Indian', 'Western', 'Italian', 'Japanese',
  'Thai', 'Korean', 'Mediterranean', 'Seafood', 'Vegetarian', 'Fast Food', 'Cafe', 'Bakery',
]

export default function EditRestaurantPage() {
  const { user, isAdmin, loading: authLoading, token } = useAuth()
  const router = useRouter()
  const { id } = useParams()

  const [form, setForm] = useState(null)
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const fileInputRef = useRef()

  // Boost state
  const [boost,         setBoost]        = useState({ is_boosted: false, boost_plan: '30', boost_expires_at: null })
  const [boostSaving,   setBoostSaving]  = useState(false)
  const [boostMsg,      setBoostMsg]     = useState('')
  const [boostHistory,  setBoostHistory] = useState([])
  const [historyOpen,   setHistoryOpen]  = useState(false)
  const [historyLoading,setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isAdmin, authLoading])

  useEffect(() => {
    if (!id) return
    api.restaurants.get(id).then(data => {
      if (!data) { setError('Restaurant not found'); setFetchLoading(false); return }
      const cuisine_types = Array.isArray(data.cuisine_types) ? data.cuisine_types
        : (typeof data.cuisine_types === 'string' && data.cuisine_types ? data.cuisine_types.split(',').map(s => s.trim()) : [])
      setForm({
        name:              data.name || '',
        description:       data.description || '',
        address:           data.address || '',
        town:              data.town || '',
        district:          data.district || '',
        province:          data.province || '',
        phone:             data.phone || '',
        email:             data.email || '',
        website:           data.website || '',
        price_range:       data.price_range || '',
        cuisine_types,
        brand_color:       data.brand_color || '#FF2D55',
        google_maps_embed: data.google_maps_embed || '',
        cover_image:       data.cover_image || null,
      })
      setCoverPreview(data.cover_image || null)
      setBoost({
        is_boosted:       data.is_boosted || false,
        boost_plan:       data.boost_plan || '30',
        boost_expires_at: data.boost_expires_at || null,
      })
      setFetchLoading(false)
    }).catch(() => { setError('Failed to load restaurant'); setFetchLoading(false) })
  }, [id])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(null)
    set('cover_image', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleCuisine(cuisine) {
    setForm(f => ({
      ...f,
      cuisine_types: f.cuisine_types.includes(cuisine)
        ? f.cuisine_types.filter(c => c !== cuisine)
        : [...f.cuisine_types, cuisine],
    }))
  }

  async function handleBoostSave(enabled) {
    setBoostSaving(true); setBoostMsg('')
    try {
      const updated = await api.restaurants.boost(id, { enabled, plan: boost.boost_plan }, token)
      setBoost({
        is_boosted:       updated.is_boosted,
        boost_plan:       updated.boost_plan || '30',
        boost_expires_at: updated.boost_expires_at,
      })
      setBoostMsg(enabled ? '✓ Boost activated!' : '✓ Boost removed.')
      // Refresh history
      if (historyOpen) loadBoostHistory()
    } catch (err) {
      setBoostMsg(`Error: ${err.message}`)
    } finally {
      setBoostSaving(false)
    }
  }

  async function loadBoostHistory() {
    if (!historyOpen) {
      setHistoryOpen(true)
      if (boostHistory.length > 0) return
    }
    setHistoryLoading(true)
    try {
      const result = await api.restaurants.boostHistory(id, token)
      setBoostHistory(result.data || [])
    } catch {
      setBoostHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  function toggleHistory() {
    if (!historyOpen) {
      setHistoryOpen(true)
      loadBoostHistory()
    } else {
      setHistoryOpen(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.town || !form.district || !form.province) {
      setError('Name, town, district and province are required.')
      return
    }
    setSaving(true); setError('')
    try {
      let cover_image = form.cover_image
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `covers/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('restaurant-menus')
          .upload(path, coverFile, { upsert: true })
        if (uploadErr) throw new Error('Image upload failed: ' + uploadErr.message)
        const { data: { publicUrl } } = supabase.storage
          .from('restaurant-menus')
          .getPublicUrl(path)
        cover_image = publicUrl
      }
      await api.restaurants.update(id, { ...form, cover_image }, token)
      router.push(`/restaurants/${id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (authLoading || fetchLoading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  if (error && !form) return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-600 font-medium">{error}</p>
        <Link href="/admin" className="text-sm text-[var(--c-muted)] underline mt-2 inline-block">Back to admin</Link>
      </div>
    </>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="p-2 rounded-xl border border-[var(--c-border)] hover:bg-surface-secondary transition-colors">
            <ArrowLeft size={18} className="text-[var(--c-muted)]" />
          </Link>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
            <UtensilsCrossed size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">Edit Restaurant</h1>
            <p className="text-sm text-[var(--c-muted)]">{form?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide text-[#FF2D55]">Basic Information</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Restaurant name <span className="text-[#FF2D55]">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
            </div>
          </div>

          {/* Cover Image */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide text-[#FF2D55]">Cover Image</h2>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            {coverPreview ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-[var(--c-border)]">
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                <button type="button" onClick={removeCover}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 rounded-2xl border-2 border-dashed border-[var(--c-border)] flex flex-col items-center justify-center gap-2 hover:border-[#FF2D55]/50 hover:bg-red-50/30 transition-all group">
                <ImagePlus size={28} className="text-[var(--c-dim)] group-hover:text-[#FF2D55] transition-colors" />
                <span className="text-sm font-medium text-[var(--c-muted)] group-hover:text-[#FF2D55]">Click to upload cover photo</span>
                <span className="text-xs text-[var(--c-dim)]">JPG, PNG or WebP</span>
              </button>
            )}
          </div>

          {/* Location */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide text-[#FF2D55]">Location</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Town <span className="text-[#FF2D55]">*</span></label>
                <input value={form.town} onChange={e => set('town', e.target.value)} required
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">District <span className="text-[#FF2D55]">*</span></label>
                <input value={form.district} onChange={e => set('district', e.target.value)} required
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Province <span className="text-[#FF2D55]">*</span></label>
              <select value={form.province} onChange={e => set('province', e.target.value)} required
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white">
                <option value="">— Select province —</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Google Maps Embed URL</label>
              <input value={form.google_maps_embed} onChange={e => set('google_maps_embed', e.target.value)}
                placeholder="Paste the src URL from Google Maps → Share → Embed"
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FF2D55]/40 bg-white" />
              <p className="text-xs text-[var(--c-dim)] mt-1">Go to Google Maps → Share → Embed a map → copy only the src="..." value</p>
            </div>
          </div>

          {/* Menu & Style */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide text-[#FF2D55]">Menu & Style</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Price range</label>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(p => (
                  <button key={p} type="button" onClick={() => set('price_range', p)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border ${form.price_range === p ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-[#FF2D55]/30'}`}
                    style={form.price_range === p ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-2">Cuisine types</label>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={() => toggleCuisine(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${form.cuisine_types.includes(c) ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-[#FF2D55]/30'}`}
                    style={form.cuisine_types.includes(c) ? { background: 'linear-gradient(135deg,#FF2D55,#FF6035)' } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Brand color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={e => set('brand_color', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--c-border)] cursor-pointer p-0.5 bg-white" />
                <span className="text-sm text-[var(--c-muted)]">{form.brand_color} — used for the restaurant page theme</span>
              </div>
            </div>
          </div>

          {/* Boost Settings — own save button, separate from main form */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide text-amber-500 flex items-center gap-2">
                <Zap size={14} className="fill-amber-400 text-amber-400" /> Boost Listing
              </h2>
              {boost.is_boosted && boost.boost_expires_at && new Date(boost.boost_expires_at) > new Date() ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                  <CheckCircle2 size={11} /> Active
                </span>
              ) : boost.is_boosted && boost.boost_expires_at && new Date(boost.boost_expires_at) <= new Date() ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                  <Clock size={11} /> Expired
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
                  Inactive
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--c-muted)] leading-relaxed">
              Boosted restaurants appear first in browse &amp; search results with a <strong>Featured</strong> badge. The restaurant owner pays you directly — you activate it here manually.
            </p>

            {boost.is_boosted && boost.boost_expires_at && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                <Clock size={13} />
                Expires: {new Date(boost.boost_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-[var(--c-muted)] mb-2">Boost duration</p>
              <div className="flex gap-2">
                {[{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: '90', label: '90 days' }].map(p => (
                  <button key={p.value} type="button" onClick={() => setBoost(b => ({ ...b, boost_plan: p.value }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${boost.boost_plan === p.value ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-amber-400/40'}`}
                    style={boost.boost_plan === p.value ? { background: 'linear-gradient(135deg,#F59E0B,#EF4444)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!boost.is_boosted || (boost.boost_expires_at && new Date(boost.boost_expires_at) <= new Date()) ? (
                <button type="button" onClick={() => handleBoostSave(true)} disabled={boostSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                  <Zap size={14} className="fill-white" />
                  {boostSaving ? 'Activating…' : 'Activate Boost'}
                </button>
              ) : (
                <button type="button" onClick={() => handleBoostSave(false)} disabled={boostSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 transition-all">
                  <ZapOff size={14} />
                  {boostSaving ? 'Removing…' : 'Remove Boost'}
                </button>
              )}
              {boostMsg && (
                <p className={`text-sm font-semibold ${boostMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                  {boostMsg}
                </p>
              )}
            </div>

            {/* Boost History */}
            <div>
              <button type="button" onClick={toggleHistory}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--c-muted)] hover:text-amber-600 transition-colors">
                <History size={13} />
                {historyOpen ? 'Hide' : 'View'} boost history
              </button>

              {historyOpen && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden">
                  {historyLoading ? (
                    <div className="flex justify-center py-6"><Spinner size={20} /></div>
                  ) : boostHistory.length === 0 ? (
                    <p className="text-xs text-[var(--c-muted)] text-center py-5">No boost history yet.</p>
                  ) : (
                    <div className="divide-y divide-amber-100">
                      {boostHistory.map(h => (
                        <div key={h.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
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
                                → expires {new Date(h.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--c-dim)] shrink-0 ml-2">
                            {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-all hover:opacity-90 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link href="/admin"
              className="px-5 py-3 rounded-xl font-semibold text-sm text-[var(--c-muted)] border border-[var(--c-border)] hover:bg-surface-secondary transition-all">
              Cancel
            </Link>
          </div>

        </form>
      </main>
    </>
  )
}
