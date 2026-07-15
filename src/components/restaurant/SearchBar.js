'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui'
import clsx from 'clsx'

const PROVINCES = [
  { value: 'Western',       label: 'Western' },
  { value: 'Central',       label: 'Central' },
  { value: 'Southern',      label: 'Southern' },
  { value: 'Northern',      label: 'Northern' },
  { value: 'Eastern',       label: 'Eastern' },
  { value: 'North Western', label: 'North Western' },
  { value: 'North Central', label: 'North Central' },
  { value: 'Uva',           label: 'Uva' },
  { value: 'Sabaragamuwa',  label: 'Sabaraga...' },
]

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara',
  'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa',
  'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Moneragala', 'Ratnapura', 'Kegalle',
].map(d => ({ value: d, label: d }))
const PRICE_RANGES = [
  { value: 'budget',  label: '৳ Budget' },
  { value: 'mid',     label: '৳৳ Mid-range' },
  { value: 'premium', label: '৳৳৳ Premium' },
]

export default function SearchBar({ initialQuery = '', initialFilters = {}, onSearch, compact = false }) {
  const router   = useRouter()
  const inputRef = useRef(null)

  const [query,       setQuery]       = useState(initialQuery)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    town:       initialFilters.town || '',
    district:   initialFilters.district || '',
    province:   initialFilters.province || '',
    price_range:initialFilters.price_range || '',
    min_price:  initialFilters.min_price || '',
    max_price:  initialFilters.max_price || '',
  })

  function handleSubmit(e) {
    e?.preventDefault()
    if (!query.trim() && !Object.values(filters).some(Boolean)) return

    const params = new URLSearchParams({ q: query.trim() })
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

    if (onSearch) {
      onSearch({ q: query.trim(), ...filters })
    } else {
      router.push(`/search?${params}`)
    }
  }

  function clearAll() {
    setQuery('')
    setFilters({ town:'', district:'', province:'', price_range:'', min_price:'', max_price:'' })
    inputRef.current?.focus()
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        {/* Main search bar */}
        <div className={clsx(
          'flex flex-wrap items-center gap-2 bg-white border border-[var(--c-border)] rounded-2xl transition-shadow',
          'focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-brand-400',
          compact ? 'p-2' : 'p-2.5 md:p-3'
        )}>
          <Search size={18} className="ml-2 text-[var(--c-dim)] shrink-0" />

          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search food, restaurant, town..."
            className="flex-1 min-w-[60px] bg-transparent outline-none text-[var(--c-text)] placeholder:text-[var(--c-dim)] text-sm md:text-base"
            autoComplete="off"
          />

          {(query || hasFilters) && (
            <button type="button" onClick={clearAll} className="p-1 rounded-lg hover:bg-surface-secondary transition-colors">
              <X size={16} className="text-[var(--c-dim)]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'p-2 rounded-xl transition-colors relative',
              showFilters || hasFilters
                ? 'bg-brand-50 text-brand-600'
                : 'hover:bg-surface-secondary text-[var(--c-muted)]'
            )}>
            <SlidersHorizontal size={17} />
            {hasFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-500 rounded-full" />
            )}
          </button>

          <Button type="submit" size={compact ? 'sm' : 'md'} className="shrink-0">
            Search
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-2 p-4 bg-white border border-[var(--c-border)] rounded-2xl animate-fade-up shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Town</label>
                <input value={filters.town} onChange={e => setFilters(f => ({...f, town: e.target.value}))}
                  placeholder="e.g. Galle" className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Province</label>
                <select value={filters.province} onChange={e => setFilters(f => ({...f, province: e.target.value}))}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white transition-colors">
                  <option value="">All provinces</option>
                  {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">District</label>
                <select value={filters.district} onChange={e => setFilters(f => ({...f, district: e.target.value}))}
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white transition-colors">
                  <option value="">All districts</option>
                  {DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Price range</label>
                <div className="flex gap-1">
                  {PRICE_RANGES.map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => setFilters(f => ({...f, price_range: f.price_range === value ? '' : value}))}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors',
                        filters.price_range === value
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-[var(--c-border)] text-[var(--c-muted)] hover:border-brand-300'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Min price (Rs)</label>
                <input type="number" value={filters.min_price} onChange={e => setFilters(f => ({...f, min_price: e.target.value}))}
                  placeholder="0" min="0"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--c-muted)] mb-1 uppercase tracking-wide">Max price (Rs)</label>
                <input type="number" value={filters.max_price} onChange={e => setFilters(f => ({...f, max_price: e.target.value}))}
                  placeholder="5000" min="0"
                  className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition-colors" />
              </div>

            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--c-border)]">
              <button type="button" onClick={() => setFilters({ town:'', district:'', province:'', price_range:'', min_price:'', max_price:'' })}
                className="text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
                Clear filters
              </button>
              <Button type="submit" size="sm">Apply filters</Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
