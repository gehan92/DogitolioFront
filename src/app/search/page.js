'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { SkeletonCard, EmptyState } from '@/components/ui'
import { Search } from 'lucide-react'
import { api } from '@/lib/api'

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const query  = params.get('q') || ''

  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const filters = {
    town:        params.get('town')        || '',
    district:    params.get('district')    || '',
    province:    params.get('province')    || '',
    price_range: params.get('price_range') || '',
    min_price:   params.get('min_price')   || '',
    max_price:   params.get('max_price')   || '',
  }

  useEffect(() => {
    if (!query) return
    doSearch({ q: query, ...filters })
  }, [params])

  async function doSearch(searchParams) {
    setLoading(true)
    setSearched(true)
    try {
      const { data } = await api.restaurants.search(searchParams)
      setResults(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function handleSearch(newParams) {
    const p = new URLSearchParams()
    Object.entries(newParams).forEach(([k, v]) => { if (v) p.set(k, v) })
    router.push(`/search?${p}`)
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-8">
          <SearchBar initialQuery={query} initialFilters={filters} onSearch={handleSearch} />
        </div>

        {query && (
          <div className="flex items-center gap-2 mb-6">
            <h1 className="font-display text-2xl font-bold text-[var(--c-text)]">
              {loading ? 'Searching…' : `Results for "${query}"`}
            </h1>
            {!loading && searched && (
              <span className="text-[var(--c-muted)] text-sm">— {results.length} found</span>
            )}
          </div>
        )}

        {!query && !searched && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-display text-2xl font-bold mb-2">Search for anything</h2>
            <p className="text-[var(--c-muted)]">Food name, restaurant, town, district, or province</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No results found"
            description={`We couldn't find restaurants matching "${query}". Try a different word, town or food name.`}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((r, i) => (
              <div key={r.restaurant_id || r.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <RestaurantCard restaurant={{ ...r, id: r.restaurant_id || r.id }} />
              </div>
            ))}
          </div>
        )}

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}
