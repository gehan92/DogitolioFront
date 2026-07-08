'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { UtensilsCrossed, Building2, Coffee, ShoppingBag, ChevronLeft, ChevronRight, LocateFixed, X } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { Button, SkeletonCard, EmptyState, BannerStrip } from '@/components/ui'
import { api } from '@/lib/api'
import { getCategoryConfig } from '@/lib/venueCategories'

// Maps category slug → Lucide icon component
const CATEGORY_ICONS = {
  restaurant: UtensilsCrossed,
  hotel:      Building2,
  snack_bar:  Coffee,
  food_shop:  ShoppingBag,
}

// Tabs shown at the top of the listing so users can switch between categories
const CATEGORY_TABS = [
  { slug: '',           label: 'All Places'  },
  { slug: 'restaurant', label: 'Restaurants' },
  { slug: 'hotel',      label: 'Hotels'      },
  { slug: 'snack_bar',  label: 'Snack Bars'  },
  { slug: 'food_shop',  label: 'Food Shops'  },
]

function buildPageTitle({ category, province, town }) {
  const categoryLabel = category ? getCategoryConfig(category).label : 'All Places'
  if (province) return `${categoryLabel} in ${province}`
  if (town)     return `${categoryLabel} in ${town}`
  return categoryLabel
}

function RestaurantsContent() {
  const params = useSearchParams()
  const router = useRouter()

  const [venues,      setVenues]      = useState([])
  const [total,       setTotal]       = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)

  // "Near me" — gated by a superuser-controlled site setting
  const [nearMeFeatureOn, setNearMeFeatureOn] = useState(false)
  const [nearMeActive,    setNearMeActive]    = useState(false)
  const [nearMeLoading,   setNearMeLoading]   = useState(false)
  const [nearMeError,     setNearMeError]     = useState('')
  const [coords,          setCoords]          = useState(null)

  useEffect(() => {
    api.siteContent.get('settings')
      .then(d => setNearMeFeatureOn(!!d?.content?.near_me_enabled))
      .catch(() => {})
  }, [])

  function handleNearMeToggle() {
    if (nearMeActive) {
      setNearMeActive(false)
      setCoords(null)
      setNearMeError('')
      return
    }
    if (!navigator.geolocation) {
      setNearMeError('Location is not supported on this device.')
      return
    }
    setNearMeLoading(true)
    setNearMeError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setNearMeActive(true)
        setNearMeLoading(false)
      },
      err => {
        setNearMeLoading(false)
        setNearMeError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Enable it in your browser settings to use this.'
            : 'Could not get your location. Please try again.'
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  // All active filters read from the URL — single source of truth
  const filters = {
    town:        params.get('town')        || '',
    district:    params.get('district')    || '',
    province:    params.get('province')    || '',
    price_range: params.get('price_range') || '',
    category:    params.get('category')    || '',
  }

  const categoryConfig = getCategoryConfig(filters.category)
  const PlaceholderIcon = CATEGORY_ICONS[filters.category] || UtensilsCrossed
  const pageTitle = buildPageTitle({ category: filters.category, province: filters.province, town: filters.town })

  const fetchVenues = useCallback(async (pageNumber = 1) => {
    setLoading(true)
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      )
      if (nearMeActive && coords) {
        activeFilters.lat = coords.lat
        activeFilters.lng = coords.lng
      }
      const result = await api.restaurants.list({ page: pageNumber, limit: 12, ...activeFilters })
      setVenues(result.data || [])
      setTotal(result.total || 0)
      setTotalPages(result.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [params, nearMeActive, coords])

  useEffect(() => {
    setPage(1)
    fetchVenues(1)
  }, [params, nearMeActive, coords])

  function handleSearch(searchParams) {
    const newParams = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, value]) => { if (value) newParams.set(key, value) })
    // Keep the active category when the user searches from this page
    if (filters.category) newParams.set('category', filters.category)
    if (searchParams.q) {
      router.push(`/search?${newParams}`)
    } else {
      router.push(`/restaurants?${newParams}`)
    }
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    fetchVenues(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCategoryTab(slug) {
    const newParams = new URLSearchParams()
    // Preserve location filters when switching categories
    if (filters.town)        newParams.set('town', filters.town)
    if (filters.district)    newParams.set('district', filters.district)
    if (filters.province)    newParams.set('province', filters.province)
    if (filters.price_range) newParams.set('price_range', filters.price_range)
    if (slug)                newParams.set('category', slug)
    router.push(`/restaurants?${newParams}`)
  }

  function removeFilter(key) {
    const newParams = new URLSearchParams(params)
    newParams.delete(key)
    router.push(`/restaurants?${newParams}`)
  }

  const activeLocationFilters = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'category'
  )

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Search bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} initialFilters={filters} compact />
        </div>

        {/* Near me */}
        {nearMeFeatureOn && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <button
              onClick={handleNearMeToggle}
              disabled={nearMeLoading}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors disabled:opacity-50 ${
                nearMeActive
                  ? 'bg-brand-500 text-white border-transparent'
                  : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary'
              }`}
            >
              <LocateFixed size={15} className={nearMeLoading ? 'animate-pulse' : ''} />
              {nearMeLoading ? 'Locating…' : nearMeActive ? 'Near me' : 'Search near me'}
              {nearMeActive && <X size={13} className="ml-0.5 opacity-80" />}
            </button>
            {nearMeActive && <span className="text-xs text-[var(--c-muted)]">Sorted by distance from you</span>}
            {nearMeError && <span className="text-xs text-red-600">{nearMeError}</span>}
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
          {CATEGORY_TABS.map(tab => {
            const isActive = filters.category === tab.slug
            return (
              <button
                key={tab.slug}
                onClick={() => handleCategoryTab(tab.slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'border-[var(--c-border)] text-[var(--c-muted)] hover:bg-surface-secondary'
                }`}
                style={isActive ? { background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` } : {}}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Listing banners */}
        <BannerStrip placement="listing" className="mb-5" />
        {activeLocationFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeLocationFilters.map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-medium max-w-[200px]">
                <span className="text-xs capitalize text-brand-500 shrink-0">{key.replace('_', ' ')}:</span>
                <span className="truncate">{value}</span>
                <button onClick={() => removeFilter(key)} className="ml-0.5 hover:text-brand-900 font-bold shrink-0">×</button>
              </span>
            ))}
            <button
              onClick={() => router.push(filters.category ? `/restaurants?category=${filters.category}` : '/restaurants')}
              className="text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">{pageTitle}</h1>
          {!loading && total > 0 && (
            <p className="text-sm text-[var(--c-muted)]">
              Showing {(page - 1) * 12 + 1}–{Math.min(page * 12, total)} of {total}
            </p>
          )}
        </div>

        {/* Venue grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : venues.length === 0 ? (
          <EmptyState
            icon={PlaceholderIcon}
            title={categoryConfig.emptyMessage}
            description="Try adjusting your filters or search for something else."
            action={
              <Button onClick={() => handleCategoryTab(filters.category)} variant="secondary">
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {venues.map((venue, index) => (
                <div key={venue.id} className="animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
                  <RestaurantCard restaurant={venue} />
                </div>
              ))}
            </div>

            {/* Pagination — always shown when there are results */}
            <div className="mt-10">
              {/* Mobile: Prev / Page X of Y / Next */}
              <div className="flex sm:hidden items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex-1"
                >
                  <ChevronLeft size={16} /> Prev
                </Button>
                <span className="text-sm font-medium text-[var(--c-muted)] whitespace-nowrap px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="flex-1 justify-end"
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>

              {/* Desktop: numbered buttons */}
              <div className="hidden sm:flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={16} /> Prev
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-brand-500 text-white'
                          : 'hover:bg-surface-secondary text-[var(--c-muted)]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>

              {/* End of results */}
              {page >= totalPages && (
                <p className="text-center text-xs text-[var(--c-muted)] mt-6">
                  — You've seen all {total} results —
                </p>
              )}
            </div>
          </>
        )}

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}

export default function RestaurantsPage() {
  return (
    <Suspense>
      <RestaurantsContent />
    </Suspense>
  )
}
