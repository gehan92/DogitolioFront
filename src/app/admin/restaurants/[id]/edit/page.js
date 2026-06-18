'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, UtensilsCrossed, Building2, Coffee, ShoppingBag,
  ImagePlus, X, Zap, ZapOff, CheckCircle2, Clock, History, Wrench,
  FileText, Upload, Trash2, QrCode, Download,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import Navbar from '@/components/layout/Navbar'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { getCategoryConfig } from '@/lib/venueCategories'

const PROVINCES = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa',
]

const PRICE_RANGES = ['budget', 'mid', 'upscale']

const CUISINE_OPTIONS = [
  'Sri Lankan', 'Chinese', 'Indian', 'Western', 'Italian', 'Japanese',
  'Thai', 'Korean', 'Mediterranean', 'Seafood', 'Vegetarian', 'Fast Food', 'Cafe', 'Bakery',
]

const CATEGORY_OPTIONS = [
  { slug: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { slug: 'hotel',      label: 'Hotel',      icon: Building2 },
  { slug: 'snack_bar',  label: 'Snack Bar',  icon: Coffee },
  { slug: 'food_shop',  label: 'Food Shop',  icon: ShoppingBag },
]

const HOTEL_AMENITIES = [
  'WiFi', 'Swimming Pool', 'Gym', 'Restaurant', 'Bar', 'Parking',
  'Spa', 'Room Service', 'Airport Shuttle', 'Conference Room', 'Laundry', 'Pet Friendly',
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

  const [activeMenu,    setActiveMenu]    = useState(null)
  const [menuFile,      setMenuFile]      = useState(null)
  const [menuUploading, setMenuUploading] = useState(false)
  const [menuMsg,       setMenuMsg]       = useState('')
  const menuFileRef = useRef()
  const qrRef = useRef()

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${form?.name?.replace(/\s+/g, '-').toLowerCase() || id}.png`
    a.click()
  }

  // Boost state — separate from the main form, saved independently
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [boost,          setBoost]         = useState({ is_boosted: false, boost_plan: '30', boost_expires_at: null })
  const [boostSaving,    setBoostSaving]   = useState(false)
  const [boostMsg,       setBoostMsg]      = useState('')
  const [boostHistory,   setBoostHistory]  = useState([])
  const [historyOpen,    setHistoryOpen]   = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const categoryConfig = form ? getCategoryConfig(form.category) : getCategoryConfig('restaurant')
  const accent = categoryConfig.accentColor

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isAdmin, authLoading])

  useEffect(() => {
    if (!id) return
    api.restaurants.get(id).then(data => {
      if (!data) { setError('Restaurant not found'); setFetchLoading(false); return }
      const cuisine_types = Array.isArray(data.cuisine_types)
        ? data.cuisine_types
        : (typeof data.cuisine_types === 'string' && data.cuisine_types
            ? data.cuisine_types.split(',').map(s => s.trim())
            : [])
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
        category:          data.category || 'restaurant',
        category_meta:     data.category_meta || {},
        social_facebook:   data.social_facebook || '',
        social_instagram:  data.social_instagram || '',
        social_tiktok:     data.social_tiktok || '',
        meta_title:        data.meta_title || '',
        meta_description:  data.meta_description || '',
      })
      setCoverPreview(data.cover_image || null)
      setActiveMenu(data.active_menu || null)
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

  function setMeta(field, value) {
    setForm(f => ({ ...f, category_meta: { ...f.category_meta, [field]: value } }))
  }

  function handleCategoryChange(slug) {
    setForm(f => ({ ...f, category: slug, category_meta: {} }))
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

  function toggleAmenity(amenity) {
    const current = form.category_meta?.amenities || []
    setMeta('amenities', current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity]
    )
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
      if (historyOpen) loadBoostHistory()
    } catch (err) {
      setBoostMsg(`Error: ${err.message}`)
    } finally {
      setBoostSaving(false)
    }
  }

  async function loadBoostHistory() {
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

  async function handleMenuUpload() {
    if (!menuFile) return
    if (!confirm(`Upload "${menuFile.name}" as the menu for "${form.name}"?\n\nThis will replace any existing menu PDF.`)) return
    setMenuUploading(true); setMenuMsg('')
    try {
      const fd = new FormData()
      fd.append('menu', menuFile)
      const result = await api.menus.upload(id, fd, token)
      setActiveMenu(result.menu)
      setMenuFile(null)
      if (menuFileRef.current) menuFileRef.current.value = ''
      setMenuMsg('✓ Menu uploaded successfully!')
    } catch (err) {
      setMenuMsg(`Error: ${err.message}`)
    } finally {
      setMenuUploading(false)
    }
  }

  async function handleMenuDelete() {
    if (!activeMenu) return
    if (!confirm('Delete the current menu PDF?\n\nVisitors won\'t be able to view the menu until a new one is uploaded.')) return
    try {
      await api.menus.delete(activeMenu.id, token)
      setActiveMenu(null)
      setMenuMsg('✓ Menu deleted.')
    } catch (err) {
      setMenuMsg(`Error: ${err.message}`)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.town || !form.district || !form.province) {
      setError('Name, town, district and province are required.')
      return
    }
    if (!confirm(`Save changes to "${form.name}"?`)) return
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

  const CategoryIcon = CATEGORY_OPTIONS.find(o => o.slug === form.category)?.icon || UtensilsCrossed
  const boostActive = boost.is_boosted && boost.boost_expires_at && new Date(boost.boost_expires_at) > new Date()
  const boostExpired = boost.is_boosted && boost.boost_expires_at && new Date(boost.boost_expires_at) <= new Date()

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="p-2 rounded-xl border border-[var(--c-border)] hover:bg-surface-secondary transition-colors">
            <ArrowLeft size={18} className="text-[var(--c-muted)]" />
          </Link>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}
          >
            <CategoryIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">Edit {categoryConfig.singularLabel}</h1>
            <p className="text-sm text-[var(--c-muted)]">{form?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Venue Category */}
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Venue Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORY_OPTIONS.map(({ slug, label, icon: Icon }) => {
                const config = getCategoryConfig(slug)
                const isActive = form.category === slug
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => handleCategoryChange(slug)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 ${
                      isActive
                        ? 'border-transparent text-white shadow-md'
                        : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-gray-300 bg-white'
                    }`}
                    style={isActive ? { background: `linear-gradient(135deg,${config.gradientFrom},${config.gradientTo})` } : {}}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                )
              })}
            </div>
            {form.category !== (form._originalCategory || form.category) && (
              <p className="text-xs text-amber-600 font-medium">
                Changing the category will clear any category-specific details below.
              </p>
            )}
          </div>

          {/* Basic Information */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Basic Information</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">
                {categoryConfig.singularLabel} name <span style={{ color: accent }}>*</span>
              </label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white resize-none"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>
          </div>

          {/* Cover Image */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Cover Image</h2>
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
                className="w-full h-40 rounded-2xl border-2 border-dashed border-[var(--c-border)] flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-all group">
                <ImagePlus size={28} className="text-[var(--c-dim)]" />
                <span className="text-sm font-medium text-[var(--c-muted)]">Click to upload cover photo</span>
                <span className="text-xs text-[var(--c-dim)]">JPG, PNG or WebP</span>
              </button>
            )}
          </div>

          {/* Location */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Location</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Town <span style={{ color: accent }}>*</span></label>
                <input value={form.town} onChange={e => set('town', e.target.value)} required
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">District <span style={{ color: accent }}>*</span></label>
                <input value={form.district} onChange={e => set('district', e.target.value)} required
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Province <span style={{ color: accent }}>*</span></label>
              <select value={form.province} onChange={e => set('province', e.target.value)} required
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white">
                <option value="">— Select province —</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Google Maps Embed URL</label>
              <input value={form.google_maps_embed} onChange={e => set('google_maps_embed', e.target.value)}
                placeholder="Paste the src URL from Google Maps → Share → Embed"
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
              <p className="text-xs text-[var(--c-dim)] mt-1">Google Maps → Share → Embed a map → copy only the src="…" value</p>
            </div>
          </div>

          {/* Details & Style */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Details & Style</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Price range</label>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(p => (
                  <button key={p} type="button" onClick={() => set('price_range', p)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all border ${form.price_range === p ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}
                    style={form.price_range === p ? { background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` } : {}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {categoryConfig.features.cuisineTypes && (
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-2">Cuisine types</label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${form.cuisine_types.includes(c) ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}
                      style={form.cuisine_types.includes(c) ? { background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` } : {}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Brand color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.brand_color} onChange={e => set('brand_color', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[var(--c-border)] cursor-pointer p-0.5 bg-white" />
                <span className="text-sm text-[var(--c-muted)]">{form.brand_color} — used for the venue page theme</span>
              </div>
            </div>
          </div>

          {/* Hotel-specific fields */}
          {form.category === 'hotel' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-[#0EA5E9]">Hotel Details</h2>

              {/* Star rating */}
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-2">Star rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => {
                    const isActive = form.category_meta?.star_rating === n
                    return (
                      <button key={n} type="button" onClick={() => setMeta('star_rating', n)}
                        className={`w-12 h-10 rounded-xl text-sm font-bold border transition-all ${isActive ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}
                        style={isActive ? { background: 'linear-gradient(135deg,#0EA5E9,#06B6D4)' } : {}}>
                        {n}★
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Check-in / Check-out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Check-in time</label>
                  <input type="time" value={form.category_meta?.check_in || ''}
                    onChange={e => setMeta('check_in', e.target.value)}
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Check-out time</label>
                  <input type="time" value={form.category_meta?.check_out || ''}
                    onChange={e => setMeta('check_out', e.target.value)}
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
                </div>
              </div>

              {/* Booking URL */}
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Booking URL</label>
                <input value={form.category_meta?.booking_url || ''}
                  onChange={e => setMeta('booking_url', e.target.value)}
                  placeholder="https://booking.com/hotel/..."
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {HOTEL_AMENITIES.map(amenity => {
                    const selected = (form.category_meta?.amenities || []).includes(amenity)
                    return (
                      <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${selected ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}
                        style={selected ? { background: 'linear-gradient(135deg,#0EA5E9,#06B6D4)' } : {}}>
                        {amenity}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Boost Settings — own save button, separate from main form */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-amber-500 flex items-center gap-2">
                <Zap size={14} className="fill-amber-400 text-amber-400" /> Boost Listing
              </h2>
              {boostActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                  <CheckCircle2 size={11} /> Active
                </span>
              ) : boostExpired ? (
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
              Boosted listings appear first in browse &amp; search results with a <strong>Featured</strong> badge. The owner pays you directly — activate it here manually.
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
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${boost.boost_plan === p.value ? 'text-white border-transparent' : 'border-[var(--c-border)] text-[var(--c-muted)]'}`}
                    style={boost.boost_plan === p.value ? { background: 'linear-gradient(135deg,#F59E0B,#EF4444)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!boost.is_boosted || boostExpired ? (
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

          {/* Menu PDF */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2" style={{ color: accent }}>
              <FileText size={14} /> Menu PDF
            </h2>
            <p className="text-xs text-[var(--c-muted)] leading-relaxed">
              Upload a PDF menu that visitors can view and download on the public page. Only one active menu is shown at a time — uploading a new one replaces the current one.
            </p>

            {/* Current active menu */}
            {activeMenu ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--c-border)] bg-gray-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-text)] truncate">Menu v{activeMenu.version}</p>
                    <p className="text-xs text-[var(--c-muted)]">
                      Uploaded {activeMenu.created_at
                        ? new Date(activeMenu.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'just now'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={activeMenu.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-[var(--c-muted)] hover:text-[var(--c-text)] underline transition-colors">
                    View
                  </a>
                  <button type="button" onClick={handleMenuDelete}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--c-dim)] italic">No menu PDF uploaded yet.</p>
            )}

            {/* Upload new PDF */}
            <div className="space-y-3">
              <input
                ref={menuFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => { setMenuFile(e.target.files?.[0] || null); setMenuMsg('') }}
              />
              {menuFile ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--c-border)] bg-blue-50/50">
                  <FileText size={15} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-[var(--c-text)] truncate flex-1">{menuFile.name}</span>
                  <button type="button" onClick={() => { setMenuFile(null); if (menuFileRef.current) menuFileRef.current.value = '' }}
                    className="text-[var(--c-muted)] hover:text-[var(--c-text)] shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => menuFileRef.current?.click()}
                  className="w-full h-20 rounded-2xl border-2 border-dashed border-[var(--c-border)] flex flex-col items-center justify-center gap-1.5 hover:bg-gray-50 transition-all">
                  <Upload size={18} className="text-[var(--c-dim)]" />
                  <span className="text-xs font-medium text-[var(--c-muted)]">Click to choose a PDF (max 20 MB)</span>
                </button>
              )}

              {menuFile && (
                <button type="button" onClick={handleMenuUpload} disabled={menuUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}>
                  <Upload size={14} />
                  {menuUploading ? 'Uploading…' : activeMenu ? 'Replace Menu' : 'Upload Menu'}
                </button>
              )}

              {menuMsg && (
                <p className={`text-sm font-semibold ${menuMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                  {menuMsg}
                </p>
              )}
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-orange-500 flex items-center gap-2">
              <Wrench size={14} className="text-orange-400" /> Maintenance Mode
            </h2>
            <p className="text-xs text-[var(--c-muted)] leading-relaxed">
              When enabled, a banner appears on the public listing page saying the venue is temporarily under maintenance. The restaurant remains visible but customers see the notice.
            </p>
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--c-border)] bg-gray-50/50">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Under maintenance / under construction</p>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">
                  {form.category_meta?.under_maintenance ? 'Banner is currently visible to visitors.' : 'No banner shown to visitors.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMeta('under_maintenance', !form.category_meta?.under_maintenance)}
                className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${form.category_meta?.under_maintenance ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.category_meta?.under_maintenance ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            {form.category_meta?.under_maintenance && (
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Maintenance message (shown to visitors)</label>
                <input
                  value={form.category_meta?.maintenance_message || ''}
                  onChange={e => setMeta('maintenance_message', e.target.value)}
                  placeholder="e.g. We are temporarily closed for renovations. Back soon!"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = '#F97316' + '66'}
                  onBlur={e => e.target.style.borderColor = ''}
                />
                <p className="text-xs text-[var(--c-dim)] mt-1">Leave blank to use the default message.</p>
              </div>
            )}
          </div>

          {/* Social Media & SEO */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Social Media & SEO</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Facebook URL</label>
                <input value={form.social_facebook} onChange={e => set('social_facebook', e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Instagram URL</label>
                <input value={form.social_instagram} onChange={e => set('social_instagram', e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">TikTok URL</label>
                <input value={form.social_tiktok} onChange={e => set('social_tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">SEO Title (meta title)</label>
              <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)}
                placeholder="Best pizza in Colombo — Restaurant Name"
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">SEO Description (meta description)</label>
              <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2}
                placeholder="Short description shown in Google search results (max 160 characters)"
                maxLength={160}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white resize-none"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
              <p className="text-xs text-[var(--c-dim)] mt-1">{form.meta_description.length}/160 characters</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="card p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0"
                style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}>
                <QrCode size={16} />
              </span>
              <div>
                <h2 className="font-bold text-[15px] text-[var(--c-text)]">QR Code</h2>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">Customers scan this to open the menu page instantly.</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              {/* Printed card preview */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div ref={qrRef}
                  className="bg-white rounded-3xl shadow-lg border border-gray-100 px-7 py-6 flex flex-col items-center gap-3 w-56">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">Scan to View Menu</p>
                  <div className="p-1 rounded-xl" style={{ background: accent + '12' }}>
                    <QRCodeCanvas
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://mealhear.lk'}/restaurants/${id}`}
                      size={152}
                      level="H"
                      fgColor={accent}
                      bgColor="#ffffff"
                      marginSize={0}
                    />
                  </div>
                  <div className="w-full pt-2 border-t border-gray-100 text-center">
                    <p className="text-[13px] font-black text-gray-800 leading-tight truncate">{form?.name || 'Restaurant Name'}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide">mealhear.lk</p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--c-dim)]">Print preview</p>
              </div>

              {/* Right: actions + tips */}
              <div className="flex-1 w-full space-y-5">
                {/* URL row */}
                <div>
                  <p className="text-xs font-bold text-[var(--c-muted)] mb-2 uppercase tracking-wide">Page URL</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-[var(--c-border)] rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-[var(--c-text)] break-all leading-relaxed">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://mealhear.lk'}/restaurants/{id}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/restaurants/${id}`)
                        setCopiedUrl(true)
                        setTimeout(() => setCopiedUrl(false), 2000)
                      }}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
                      style={copiedUrl
                        ? { background: accent + '18', borderColor: accent + '44', color: accent }
                        : { background: 'white', borderColor: 'var(--c-border)', color: 'var(--c-muted)' }}
                    >
                      {copiedUrl ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Download */}
                <div>
                  <p className="text-xs font-bold text-[var(--c-muted)] mb-2 uppercase tracking-wide">Download</p>
                  <button
                    type="button"
                    onClick={downloadQR}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}
                  >
                    <Download size={15} />
                    Download PNG
                  </button>
                  <p className="text-xs text-[var(--c-dim)] mt-1.5">High-res PNG — print at any size without quality loss.</p>
                </div>

                {/* Placement tips */}
                <div className="rounded-2xl border border-[var(--c-border)] bg-gray-50 p-4 space-y-2.5">
                  <p className="text-xs font-bold text-[var(--c-text)] uppercase tracking-wide">Placement tips</p>
                  {[
                    'Entrance or reception counter — first thing guests see',
                    'On each table for in-seat browsing',
                    'Printed on packaging, receipts, or flyers',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{ background: accent }}>
                        {i + 1}
                      </span>
                      <p className="text-xs text-[var(--c-muted)] leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
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
              style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}>
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
