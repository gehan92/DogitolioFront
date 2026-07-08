'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed, Building2, Coffee, ShoppingBag, ImagePlus, X, LocateFixed } from 'lucide-react'
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
  'Rice & Curry', 'Kottu', 'Breakfast', 'Desserts',
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

export default function NewRestaurantPage() {
  const { user, isAdmin, loading: authLoading, token } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', description: '', address: '', town: '', district: '',
    province: '', phone: '', email: '', website: '',
    price_range: '', cuisine_types: [],
    brand_color: '#FF2D55', google_maps_embed: '',
    latitude: '', longitude: '',
    category: 'restaurant', category_meta: {},
  })
  const [coverFile,    setCoverFile]    = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [locating, setLocating] = useState(false)
  const fileInputRef = useRef()

  const categoryConfig = getCategoryConfig(form.category)
  const accent = categoryConfig.accentColor

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isAdmin, authLoading])

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

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Location is not supported on this device.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude.toFixed(6))
        set('longitude', pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      err => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Allow it for this site in your browser settings and try again.'
            : 'Could not get your current location. Make sure location services are turned on for your browser/device, then try again.'
        )
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    )
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(null)
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.town || !form.district || !form.province) {
      setError('Name, town, district and province are required.')
      return
    }
    setSaving(true); setError('')
    try {
      let cover_image = null
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
      const payload = {
        ...form,
        cover_image,
        latitude:  form.latitude  !== '' ? +form.latitude  : null,
        longitude: form.longitude !== '' ? +form.longitude : null,
      }
      const data = await api.restaurants.create(payload, token)
      router.push(`/restaurants/${data.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (authLoading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]"><Spinner size={32} /></div>
    </>
  )

  const CategoryIcon = CATEGORY_OPTIONS.find(o => o.slug === form.category)?.icon || UtensilsCrossed

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
            <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">Add {categoryConfig.singularLabel}</h1>
            <p className="text-sm text-[var(--c-muted)]">Fill in the details to list a new {categoryConfig.singularLabel.toLowerCase()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Venue Category */}
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-[var(--c-text)] text-sm uppercase tracking-wide" style={{ color: accent }}>
              Venue Category
            </h2>
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
          </div>

          {/* Basic Information */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Basic Information</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">
                {categoryConfig.singularLabel} name <span style={{ color: accent }}>*</span>
              </label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                placeholder={`e.g. ${form.category === 'hotel' ? 'Grand Ocean Hotel' : form.category === 'snack_bar' ? 'Lucky Snack Bar' : form.category === 'food_shop' ? 'Fresh Food Corner' : 'The Spice Garden'}`}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                style={{ '--tw-ring-color': accent }}
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                placeholder={`Short description of the ${categoryConfig.singularLabel.toLowerCase()}…`}
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white resize-none"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+94 11 234 5678"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="contact@email.com"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)}
                placeholder="https://example.com"
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
                <ImagePlus size={28} className="text-[var(--c-dim)] transition-colors" />
                <span className="text-sm font-medium text-[var(--c-muted)]">Click to upload cover photo</span>
                <span className="text-xs text-[var(--c-dim)]">JPG, PNG or WebP — recommended 1200×600px</span>
              </button>
            )}
          </div>

          {/* Location */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: accent }}>Location</h2>

            <div>
              <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="123 Main Street"
                className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = ''} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">Town <span style={{ color: accent }}>*</span></label>
                <input value={form.town} onChange={e => set('town', e.target.value)} required
                  placeholder="e.g. Colombo"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1.5">District <span style={{ color: accent }}>*</span></label>
                <input value={form.district} onChange={e => set('district', e.target.value)} required
                  placeholder="e.g. Colombo"
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--c-muted)]">Coordinates (for "near me" search)</label>
                <button type="button" onClick={useCurrentLocation} disabled={locating}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">
                  <LocateFixed size={12} /> {locating ? 'Locating…' : 'Use my current location'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)}
                  placeholder="Latitude, e.g. 6.9271"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
                <input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)}
                  placeholder="Longitude, e.g. 79.8612"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                  onFocus={e => e.target.style.borderColor = accent + '66'}
                  onBlur={e => e.target.style.borderColor = ''} />
              </div>
              <p className="text-xs text-[var(--c-dim)] mt-1">On Google Maps, right-click the exact spot → click the coordinates to copy them.</p>
            </div>
          </div>

          {/* Menu & Style */}
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
              {saving ? 'Creating…' : `Create ${categoryConfig.singularLabel}`}
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
