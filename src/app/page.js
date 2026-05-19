import Link from 'next/link'
import { api } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { UtensilsCrossed, MapPin, ArrowRight, Building2, Coffee, ShoppingBag, Search as SearchIcon, BookOpen, Star, Phone, Info } from 'lucide-react'

export default async function HomePage() {
  let featured = []
  try {
    const { data } = await api.restaurants.list({ limit: 6, page: 1 })
    featured = data || []
  } catch {}

  const provinces = [
    { name: 'Western'      },
    { name: 'Southern'     },
    { name: 'Central'      },
    { name: 'Northern'     },
    { name: 'Eastern'      },
    { name: 'North Western'},
    { name: 'North Central'},
    { name: 'Uva'          },
    { name: 'Sabaragamuwa' },
  ]

  const categories = [
    { label: 'Hotels',      icon: Building2,      href: '/restaurants?type=hotel' },
    { label: 'Restaurants', icon: UtensilsCrossed, href: '/restaurants?type=restaurant' },
    { label: 'Food Shops',  icon: ShoppingBag,    href: '/restaurants?type=food_shop' },
    { label: 'Snack Bars',  icon: Coffee,         href: '/restaurants?type=snack_bar' },
  ]

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO */}
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 py-20"
          style={{ background: 'linear-gradient(135deg, #FF2D55 0%, #FF4E2A 60%, #FF6035 100%)' }}>

          {/* Subtle diagonal stripe pattern */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)' }} />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-white/40 bg-white/20 rounded-full px-4 py-1.5 text-xs text-white font-semibold mb-8 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              Sri Lanka&apos;s Food Discovery Platform
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-[88px] font-black text-white leading-[1.03] tracking-tight mb-6 drop-shadow-sm">
              Find the best<br />food menu<br />near you
            </h1>

            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
              Hotels, restaurants, food shops &amp; snack bars —
              every menu in one place.
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto mb-9">
              <SearchBar />
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {categories.map(({ label, icon: Icon, href }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#FF2D55] text-sm font-bold shadow-sm hover:bg-white/90 hover:scale-[1.03] transition-all duration-200">
                  <Icon size={14} strokeWidth={2.5} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS */}
        <section className="bg-white border-b border-[var(--c-border)]">
          <div className="max-w-3xl mx-auto px-4 py-10 grid grid-cols-3 divide-x divide-[var(--c-border)]">
            {[
              { value: '500+', label: 'Food Places' },
              { value: '9',    label: 'Provinces' },
              { value: '10K+', label: 'Reviews' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-4">
                <div className="text-2xl md:text-3xl font-black" style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
                <div className="text-xs md:text-sm text-[var(--c-muted)] font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BROWSE BY PROVINCE */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-10">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Explore</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[var(--c-text)]">Browse by province</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
              {provinces.map(({ name }) => (
                <Link key={name} href={`/restaurants?province=${encodeURIComponent(name)}`}
                  className="group flex flex-col items-center gap-2.5 py-5 px-2 rounded-2xl border border-[var(--c-border)] bg-white hover:border-[#FF2D55]/30 hover:bg-[#FF2D55]/[0.04] hover:shadow-glow-sm transition-all duration-200">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--c-surface2)] group-hover:bg-[#FF2D55]/10 transition-colors">
                    <MapPin size={16} className="text-[var(--c-muted)] group-hover:text-[#FF2D55] transition-colors" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--c-muted)] group-hover:text-[#FF2D55] text-center leading-tight transition-colors">{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED */}
        {featured.length > 0 && (
          <section className="bg-[#f9f9f9] py-16">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Discover</p>
                  <h2 className="font-display text-3xl md:text-4xl font-black text-[var(--c-text)]">Featured places</h2>
                </div>
                <Link href="/restaurants" className="hidden md:flex items-center gap-1.5 text-sm font-bold text-[#FF2D55] hover:gap-3 transition-all duration-200">
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
              <div className="mt-8 text-center md:hidden">
                <Link href="/restaurants" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FF2D55]">
                  View all places <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── HOW IT WORKS */}
        <section className="bg-[#080808] py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-3">Simple</p>
              <h2 className="font-display text-3xl md:text-5xl font-black text-white">How Digitolio works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { num: '01', title: 'Search', desc: 'Find food menus at hotels, restaurants, food shops and snack bars by name, price or location.' },
                { num: '02', title: 'View Menu', desc: 'Browse the full menu with current prices — always up to date and accurate.' },
                { num: '03', title: 'Review', desc: 'Sign in and share your experience to help others find great food nearby.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="p-7 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:border-[#FF2D55]/30 hover:bg-white/[0.05] transition-all duration-300 group">
                  <div className="text-5xl font-black mb-5 leading-none" style={{ background: 'linear-gradient(180deg,#FF2D55 0%,rgba(255,45,85,0.1) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{num}</div>
                  <h3 className="font-display text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER */}
        <footer className="bg-[#080808] border-t border-white/[0.05]">
          <div className="max-w-6xl mx-auto px-4 pt-14 pb-10">
            {/* Top row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/logo.svg" alt="Digitolio" className="w-9 h-9" />
                  <span className="font-bold text-white text-lg tracking-tight">Digitolio</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                  Sri Lanka&apos;s food discovery platform. Find menus from hotels, restaurants, food shops and snack bars — all in one place.
                </p>
              </div>
              {/* Explore */}
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Explore</p>
                <ul className="space-y-2.5">
                  <li><Link href="/" className="text-white/55 text-sm hover:text-white transition-colors">Home</Link></li>
                  <li><Link href="/restaurants" className="text-white/55 text-sm hover:text-white transition-colors">All Places</Link></li>
                  <li><Link href="/search" className="text-white/55 text-sm hover:text-white transition-colors">Search Menus</Link></li>
                </ul>
              </div>
              {/* Company */}
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Company</p>
                <ul className="space-y-2.5">
                  <li><Link href="/about" className="text-white/55 text-sm hover:text-white transition-colors">About Us</Link></li>
                  <li><Link href="/contact" className="text-white/55 text-sm hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link href="/auth" className="text-white/55 text-sm hover:text-white transition-colors">Sign In</Link></li>
                </ul>
              </div>
            </div>
            {/* Bottom row */}
            <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-white/50 text-xs text-center">© 2026 Digitolio. All rights reserved.</p>
            <p className="text-white/50 text-xs">Find food menus across Sri Lanka.</p>
            </div>
          </div>
        </footer>

        {/* Spacer for mobile bottom nav */}
        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
