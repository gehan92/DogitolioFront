'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { Button, SkeletonCard, EmptyState } from '@/components/ui'
import { UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'

function RestaurantsContent() {
  const params   = useSearchParams()
  const router   = useRouter()

  const [restaurants, setRestaurants] = useState([])
  const [total,       setTotal]       = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)

  // Read filters from URL
  const filters = {
    town:        params.get('town')        || '',
    district:    params.get('district')    || '',
    province:    params.get('province')    || '',
    price_range: params.get('price_range') || '',
  }

  const fetchRestaurants = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const queryParams = { page: p, limit: 12, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
      const data = await api.restaurants.list(queryParams)
      setRestaurants(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    setPage(1)
    fetchRestaurants(1)
  }, [params])

  function handleSearch(searchParams) {
    const newParams = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => { if (v) newParams.set(k, v) })
    // If has search query, go to search page
    if (searchParams.q) {
      router.push(`/search?${newParams}`)
    } else {
      router.push(`/restaurants?${newParams}`)
    }
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    fetchRestaurants(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v)

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Search */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} initialFilters={filters} compact />
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">
                <span className="text-xs capitalize text-brand-500">{key.replace('_', ' ')}:</span>
                {value}
                <button onClick={() => {
                  const p = new URLSearchParams(params)
                  p.delete(key)
                  router.push(`/restaurants?${p}`)
                }} className="ml-0.5 hover:text-brand-900 font-bold">×</button>
              </span>
            ))}
            <button onClick={() => router.push('/restaurants')} className="text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">
            {filters.province || filters.town || 'All restaurants'}
          </h1>
          {!loading && <p className="text-sm text-[var(--c-muted)]">{total} found</p>}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No restaurants found"
            description="Try adjusting your filters or search for something else."
            action={<Button onClick={() => router.push('/restaurants')} variant="secondary">Clear filters</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {restaurants.map((r, i) => (
                <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <RestaurantCard restaurant={r} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button variant="secondary" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                  <ChevronLeft size={16} /> Prev
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-brand-500 text-white'
                          : 'hover:bg-surface-secondary text-[var(--c-muted)]'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>

                <Button variant="secondary" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            )}
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
