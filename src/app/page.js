import Link from 'next/link'
import { api } from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import SearchBar from '@/components/restaurant/SearchBar'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import { BannerStrip } from '@/components/ui'
import { UtensilsCrossed, MapPin, ArrowRight, Building2, Coffee, ShoppingBag, Star, Shield, Zap, BookOpen, RefreshCw, SmilePlus } from 'lucide-react'

export default async function HomePage() {
  let featured = []
  let cms = {}
  try {
    const { data } = await api.restaurants.list({ limit: 6, page: 1 })
    featured = data || []
  } catch {}
  try {
    const cmsData = await api.siteContent.get('home')
    cms = cmsData?.content || {}
  } catch {}

  // ── CMS values with fallbacks ──────────────────────────────────────────────
  const heroBadge         = cms.heroBadge         || "Sri Lanka's Food Discovery Platform"
  const heroHeadline      = cms.heroHeadline       || "Find the best food menu near you"
  const heroSubheadline   = cms.heroSubheadline    || "Hotels, restaurants, food shops & snack bars — every menu in one place."

  const stat1Value = cms.stat1Value || '500+'
  const stat1Label = cms.stat1Label || 'Food Places'
  const stat2Value = cms.stat2Value || '9'
  const stat2Label = cms.stat2Label || 'Provinces'
  const stat3Value = cms.stat3Value || '10K+'
  const stat3Label = cms.stat3Label || 'Reviews'

  const whyTitle    = cms.whyTitle    || 'Everything you need to find great food'
  const whySubtitle = cms.whySubtitle || 'Digitolio makes it easy to discover, explore and review every food place across Sri Lanka.'

  const howTitle   = cms.howTitle   || 'How Digitolio works'
  const step1Title = cms.step1Title || 'Search'
  const step1Desc  = cms.step1Desc  || 'Find food menus at hotels, restaurants, food shops and snack bars by name, price or location.'
  const step2Title = cms.step2Title || 'View Menu'
  const step2Desc  = cms.step2Desc  || 'Browse the full menu with current prices — always up to date and accurate.'
  const step3Title = cms.step3Title || 'Review'
  const step3Desc  = cms.step3Desc  || 'Sign in and share your experience to help others find great food nearby.'

  const ctaBannerHeadline    = cms.ctaBannerHeadline    || "Ready to explore Sri Lanka's best food?"
  const ctaBannerSubheadline = cms.ctaBannerSubheadline || 'Browse menus, discover restaurants and share your experience — all in one place.'

  const t1Name     = cms.t1Name     || 'Kavindi P.'
  const t1Location = cms.t1Location || 'Colombo'
  const t1Text     = cms.t1Text     || 'Finally I can check the menu and prices before going to a restaurant. Saved me so many trips!'
  const t2Name     = cms.t2Name     || 'Rashan F.'
  const t2Location = cms.t2Location || 'Galle'
  const t2Text     = cms.t2Text     || 'The PDF menu feature is excellent. I could see the full menu just like holding it in hand.'
  const t3Name     = cms.t3Name     || 'Thilini S.'
  const t3Location = cms.t3Location || 'Kandy'
  const t3Text     = cms.t3Text     || 'Great app for finding local food spots. Discovered so many new places near my home.'

  const footerDesc      = cms.footerDesc      || "Sri Lanka's food discovery platform. Find menus from hotels, restaurants, food shops and snack bars — all in one place."
  const footerCopyright = cms.footerCopyright || '© 2026 Digitolio. All rights reserved.'

  const provinces = [
    { name: 'Western',       shortName: 'Western',     rest: '120+' },
    { name: 'Southern',      shortName: 'Southern',    rest: '85+'  },
    { name: 'Central',       shortName: 'Central',     rest: '60+'  },
    { name: 'Northern',      shortName: 'Northern',    rest: '40+'  },
    { name: 'Eastern',       shortName: 'Eastern',     rest: '45+'  },
    { name: 'North Western', shortName: 'N. Western',  rest: '35+'  },
    { name: 'North Central', shortName: 'N. Central',  rest: '28+'  },
    { name: 'Uva',           shortName: 'Uva',         rest: '22+'  },
    { name: 'Sabaragamuwa',  shortName: 'Sabaraga...', rest: '30+'  },
  ]

  const categories = [
    { label: 'Hotels',      icon: Building2,      href: '/restaurants?category=hotel' },
    { label: 'Restaurants', icon: UtensilsCrossed, href: '/restaurants?category=restaurant' },
    { label: 'Food Shops',  icon: ShoppingBag,    href: '/restaurants?category=food_shop' },
    { label: 'Snack Bars',  icon: Coffee,         href: '/restaurants?category=snack_bar' },
  ]

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO */}
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 py-20">

          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=85&auto=format&fit=crop"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,rgba(255,45,85,0.82) 0%,rgba(255,78,42,0.80) 55%,rgba(10,10,20,0.88) 100%)' }} />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-white/40 bg-white/20 rounded-full px-4 py-1.5 text-xs text-white font-semibold mb-8 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              {heroBadge}
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-[88px] font-black text-white leading-[1.03] tracking-tight mb-6 drop-shadow-sm whitespace-pre-line">
              {heroHeadline}
            </h1>

            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
              {heroSubheadline}
            </p>

            <div className="max-w-2xl mx-auto mb-9">
              <SearchBar />
            </div>

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
              { value: stat1Value, label: stat1Label },
              { value: stat2Value, label: stat2Label },
              { value: stat3Value, label: stat3Label },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-4">
                <div className="text-2xl md:text-3xl font-black" style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
                <div className="text-xs md:text-sm text-[var(--c-muted)] font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BANNERS */}
        <div className="max-w-5xl mx-auto px-4 py-4">
          <BannerStrip placement="home" />
        </div>

        {/* ── WHY DIGITOLIO */}
        <section className="bg-white py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Why us</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-gray-900">{whyTitle}</h2>
              <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">{whySubtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: BookOpen,   color: '#FF2D55', bg: '#fff0f3', title: 'Full Menus Online',   desc: 'See real PDF menus with prices — no guessing, no outdated info.' },
                { icon: RefreshCw,  color: '#FF6035', bg: '#fff4f0', title: 'Always Up to Date',   desc: 'Admins upload fresh menus so you always see current prices.' },
                { icon: Shield,     color: '#7C3AED', bg: '#f5f3ff', title: 'Trusted Reviews',     desc: 'Verified user ratings and comments you can trust.' },
                { icon: SmilePlus,  color: '#059669', bg: '#ecfdf5', title: '100% Free to Use',    desc: 'Completely free for diners. No signup needed to browse menus.' },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                    <Icon size={20} style={{ color }} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-[15px] mb-1.5">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CUISINE TYPES */}
        <section className="py-16" style={{ background: 'var(--c-bg)' }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Explore by type</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-gray-900">What are you craving?</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { img: 'https://images.unsplash.com/photo-1586511925558-a4c6376fe65f?w=400&q=80&auto=format&fit=crop', label: 'Rice & Curry',  href: '/search?q=rice+curry',  sub: 'Traditional Sri Lankan' },
                { img: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&q=80&auto=format&fit=crop', label: 'Kottu',          href: '/search?q=kottu',        sub: 'Street food favourite' },
                { img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&auto=format&fit=crop', label: 'Fast Food',      href: '/search?q=fast+food',    sub: 'Quick & tasty' },
                { img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80&auto=format&fit=crop', label: 'Bakery',         href: '/search?q=bakery',       sub: 'Fresh baked daily' },
                { img: 'https://images.unsplash.com/photo-1447279506476-3faec8071eee?w=400&q=80&auto=format&fit=crop', label: 'Seafood',        href: '/search?q=seafood',      sub: 'Fresh from the ocean' },
                { img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&auto=format&fit=crop', label: 'Café',           href: '/search?q=cafe',         sub: 'Coffee & snacks' },
                { img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80&auto=format&fit=crop', label: 'Breakfast',      href: '/search?q=breakfast',    sub: 'Start your day right' },
                { img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80&auto=format&fit=crop', label: 'Desserts',       href: '/search?q=dessert',      sub: 'Sweet treats' },
              ].map(({ img, label, href, sub }) => (
                <Link key={label} href={href}
                  className="group relative rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <img src={img} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-black text-white text-sm leading-tight">{label}</p>
                    <p className="text-white/65 text-[11px] mt-0.5">{sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── BROWSE BY PROVINCE */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">Explore Sri Lanka</p>
                <h2 className="font-display text-3xl md:text-4xl font-black text-gray-900">Browse by province</h2>
                <p className="text-gray-400 text-sm mt-2">Discover food places in every corner of the island</p>
              </div>
              <Link href="/restaurants" className="hidden md:flex items-center gap-1.5 text-sm font-bold text-[#FF2D55] hover:gap-3 transition-all duration-200">
                View all <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {provinces.map(({ name, shortName, rest }, i) => {
                const colors = [
                  { from: '#FF2D55', to: '#FF6035' },
                  { from: '#FF6035', to: '#FF9500' },
                  { from: '#7C3AED', to: '#A855F7' },
                  { from: '#0EA5E9', to: '#06B6D4' },
                  { from: '#059669', to: '#10B981' },
                  { from: '#F59E0B', to: '#FBBF24' },
                  { from: '#EC4899', to: '#F472B6' },
                  { from: '#6366F1', to: '#818CF8' },
                  { from: '#14B8A6', to: '#2DD4BF' },
                ][i]
                return (
                  <Link key={name} href={`/restaurants?province=${encodeURIComponent(name)}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg,${colors.from},${colors.to})` }}>
                      <MapPin size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{shortName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{rest} places</p>
                    </div>
                    <ArrowRight size={15} className="text-gray-300 group-hover:text-[#FF2D55] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── FEATURED */}
        {featured.length > 0 && (
          <section className="py-16" style={{ background: 'var(--c-surface2)' }}>
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
              <h2 className="font-display text-3xl md:text-5xl font-black text-white">{howTitle}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { num: '01', title: step1Title, desc: step1Desc },
                { num: '02', title: step2Title, desc: step2Desc },
                { num: '03', title: step3Title, desc: step3Desc },
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

        {/* ── TESTIMONIALS */}
        <section className="bg-white py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-2">What people say</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-gray-900">Loved by food lovers across Sri Lanka</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { name: t1Name, location: t1Location, rating: 5, text: t1Text },
                { name: t2Name, location: t2Location, rating: 5, text: t2Text },
                { name: t3Name, location: t3Location, rating: 5, text: t3Text },
              ].map(({ name, location, rating, text }) => (
                <div key={name} className="p-6 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{name}</p>
                      <p className="text-[11px] text-gray-400">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER */}
        <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg,#FF2D55 0%,#FF4E2A 60%,#FF6035 100%)' }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-5xl font-black text-white mb-4 leading-tight whitespace-pre-line">
              {ctaBannerHeadline}
            </h2>
            <p className="text-white/80 text-base mb-8 max-w-md mx-auto">
              {ctaBannerSubheadline}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/restaurants"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-[#FF2D55] text-sm font-black shadow-lg hover:scale-[1.03] transition-transform duration-150">
                <UtensilsCrossed size={16} strokeWidth={2.5} /> Browse All Places
              </Link>
              <Link href="/auth"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/20 border border-white/40 text-white text-sm font-bold hover:bg-white/30 transition-colors duration-150">
                Sign In Free <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER */}
        <footer className="bg-[#080808] border-t border-white/[0.05]">
          <div className="max-w-6xl mx-auto px-4 pt-14 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/logo.svg" alt="Digitolio" className="w-9 h-9 rounded-xl" />
                  <span className="font-bold text-white text-lg tracking-tight">Digitolio</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs">
                  {footerDesc}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Explore</p>
                <ul className="space-y-2.5">
                  <li><Link href="/" className="text-white/55 text-sm hover:text-white transition-colors">Home</Link></li>
                  <li><Link href="/restaurants" className="text-white/55 text-sm hover:text-white transition-colors">All Places</Link></li>
                  <li><Link href="/search" className="text-white/55 text-sm hover:text-white transition-colors">Search Menus</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Company</p>
                <ul className="space-y-2.5">
                  <li><Link href="/about" className="text-white/55 text-sm hover:text-white transition-colors">About Us</Link></li>
                  <li><Link href="/contact" className="text-white/55 text-sm hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link href="/auth" className="text-white/55 text-sm hover:text-white transition-colors">Sign In</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-white/50 text-xs text-center">{footerCopyright}</p>
              <p className="text-white/50 text-xs">Find food menus across Sri Lanka.</p>
            </div>
          </div>
        </footer>

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
