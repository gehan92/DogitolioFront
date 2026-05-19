import Link from 'next/link'
import { api } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { UtensilsCrossed, MapPin, Star, ArrowRight } from 'lucide-react'

// This page is server-rendered for SEO + speed
export default async function HomePage() {
  // Fetch featured restaurants server-side (no loading state needed)
  let featured = []
  try {
    const { data } = await api.restaurants.list({ limit: 6, page: 1 })
    featured = data || []
  } catch {}

  const provinces = ['Western','Southern','Central','Northern','Eastern','Sabaragamuwa']

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO SECTION */}
        <section className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-[#a03c10] text-white overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

          <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <UtensilsCrossed size={14} />
              Discover Sri Lanka's finest restaurants
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-black mb-4 leading-tight">
              Find your perfect<br />meal anywhere
            </h1>
            <p className="text-brand-100 text-lg md:text-xl mb-10 max-w-xl mx-auto">
              Search by food name, price, restaurant, town, district or province.
              Real menus. Real reviews.
            </p>

            {/* Search bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBar />
            </div>

            {/* Quick stats */}
            <div className="flex items-center justify-center gap-8 mt-10 text-sm text-brand-100">
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed size={15} />
                <span>500+ restaurants</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={15} />
                <span>All 9 provinces</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={15} />
                <span>Verified reviews</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── BROWSE BY PROVINCE */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-[var(--c-text)]">Browse by province</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {provinces.map(province => (
              <Link key={province} href={`/restaurants?province=${encodeURIComponent(province)}`}
                className="card flex flex-col items-center justify-center py-4 px-2 text-center hover:border-brand-300 hover:text-brand-600 transition-colors group">
                <MapPin size={18} className="text-brand-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-[var(--c-text)] leading-tight">{province}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FEATURED RESTAURANTS */}
        {featured.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-[var(--c-text)]">Featured restaurants</h2>
              <Link href="/restaurants" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                View all <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((r, i) => (
                <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <RestaurantCard restaurant={r} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── HOW IT WORKS */}
        <section className="bg-surface-secondary border-t border-[var(--c-border)]">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <h2 className="font-display text-3xl font-bold text-[var(--c-text)] mb-12">How Kade works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { emoji: '🔍', title: 'Search', desc: 'Find by food name, price range, town, district or province.' },
                { emoji: '📋', title: 'View menu', desc: 'Read the full PDF menu — always up to date with current prices.' },
                { emoji: '⭐', title: 'Leave a review', desc: 'Sign in and share your experience to help others decide.' },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="flex flex-col items-center">
                  <div className="text-4xl mb-4">{emoji}</div>
                  <h3 className="font-display font-bold text-lg text-[var(--c-text)] mb-2">{title}</h3>
                  <p className="text-[var(--c-muted)] text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Spacer for mobile bottom nav */}
        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
