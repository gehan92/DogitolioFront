'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed, ImagePlus, X } from 'lucide-react'
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
