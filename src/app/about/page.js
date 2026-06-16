import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { Target, Users, MapPin, ShieldCheck, ArrowRight, UtensilsCrossed, Building2, Coffee, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'

export const metadata = {
  title: 'About Us',
  description: 'Learn about MealHear — Sri Lanka\'s food discovery platform for hotels, restaurants, food shops and snack bars.',
}

const VALUE_ICONS = [Target, Users, MapPin, ShieldCheck]

const categories = [
  { icon: Building2,       label: 'Hotels',       desc: 'Full-service hotel dining rooms and buffets.' },
  { icon: UtensilsCrossed, label: 'Restaurants',   desc: 'From fine dining to local rice and curry spots.' },
  { icon: ShoppingBag,     label: 'Food Shops',    desc: 'Bakeries, takeaways and specialty food stores.' },
  { icon: Coffee,          label: 'Snack Bars',    desc: 'Quick bites, short eats and refreshments.' },
]

export default async function AboutPage() {
  let cms = {}
  try {
    const data = await api.siteContent.get('about')
    cms = data?.content || {}
  } catch {}

  // ── Hero
  const headline    = cms.headline    || 'About MealHear'
  const subheadline = cms.subheadline || "We built MealHear to solve a simple problem — finding food menus across Sri Lanka was hard. We made it easy."

  // ── Stats
  const stat1Value = cms.stat1Value || '500+'
  const stat1Label = cms.stat1Label || 'Food Places Listed'
  const stat2Value = cms.stat2Value || '9'
  const stat2Label = cms.stat2Label || 'Provinces Covered'
  const stat3Value = cms.stat3Value || '10K+'
  const stat3Label = cms.stat3Label || 'User Reviews'
  const stat4Value = cms.stat4Value || '4'
  const stat4Label = cms.stat4Label || 'Venue Categories'

  // ── Story
  const storyTitle = cms.storyTitle || "Sri Lanka's food discovery platform"
  const storyP1    = cms.storyP1    || "MealHear started with a simple question: \"Where can I find the menu before I go?\" We built the answer — a single platform where anyone can discover and explore food menus from hotels, restaurants, food shops and snack bars across every province in Sri Lanka."
  const storyP2    = cms.storyP2    || "Whether you're a tourist looking for a good meal, a local finding a new favourite spot, or a business owner wanting to showcase your menu — MealHear is built for you."

  // ── Values
  const values = [
    { title: cms.value1Title || 'Our Mission',       desc: cms.value1Desc || "To make it effortless for anyone in Sri Lanka to find the right food menu — whether you're at a five-star hotel or a roadside snack bar." },
    { title: cms.value2Title || 'Community First',   desc: cms.value2Desc || 'We empower real customers to share honest reviews, helping others make better food choices every day.' },
    { title: cms.value3Title || 'All 9 Provinces',   desc: cms.value3Desc || 'From Colombo to Jaffna, Kandy to Galle — we cover every province so no food place gets left behind.' },
    { title: cms.value4Title || 'Trusted & Accurate', desc: cms.value4Desc || 'Menus are kept up to date by restaurant owners and verified by our team, so you always see real prices.' },
  ]

  // ── CTA
  const ctaHeadline = cms.ctaHeadline || 'Ready to explore?'
  const ctaSubtitle = cms.ctaSubtitle || 'Find the best food menus near you — from hotels to snack bars, all across Sri Lanka.'

  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO */}
        <section className="relative overflow-hidden px-4 pt-20 pb-24"
          style={{ background: 'linear-gradient(135deg, #FF2D55 0%, #FF4E2A 60%, #FF6035 100%)' }}>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)' }} />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-white/40 bg-white/20 rounded-full px-4 py-1.5 text-xs text-white font-semibold mb-8 uppercase tracking-widest">
              Our Story
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6">
              {headline}
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-xl mx-auto">
              {subheadline}
            </p>
          </div>
        </section>

        {/* ── STATS */}
        <section className="bg-white border-b border-[var(--c-border)]">
          <div className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 divide-x divide-[var(--c-border)]">
            {[
              { value: stat1Value, label: stat1Label },
              { value: stat2Value, label: stat2Label },
              { value: stat3Value, label: stat3Label },
              { value: stat4Value, label: stat4Label },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-4">
                <div className="text-2xl md:text-3xl font-black" style={{ background: 'linear-gradient(90deg,#FF2D55,#FF6035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
                <div className="text-xs md:text-sm text-[var(--c-muted)] font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHO WE ARE */}
        <section className="bg-white py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-3">Who we are</p>
                <h2 className="font-display text-3xl md:text-4xl font-black text-[var(--c-text)] mb-5">
                  {storyTitle}
                </h2>
                <p className="text-[var(--c-muted)] leading-relaxed mb-4">
                  {storyP1}
                </p>
                <p className="text-[var(--c-muted)] leading-relaxed">
                  {storyP2}
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--c-border)] p-8 grid grid-cols-2 gap-4" style={{ background: 'var(--c-surface2)' }}>
                {categories.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="p-4 rounded-2xl bg-white border border-[var(--c-border)] hover:border-[#FF2D55]/25 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                      <Icon size={17} className="text-white" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-bold text-[var(--c-text)] mb-1">{label}</p>
                    <p className="text-[11px] text-[var(--c-muted)] leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── VALUES */}
        <section className="border-t border-[var(--c-border)] py-20" style={{ background: 'var(--c-surface2)' }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#FF2D55] uppercase tracking-widest mb-3">What drives us</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[var(--c-text)]">Our values</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {values.map(({ title, desc }, i) => {
                const Icon = VALUE_ICONS[i]
                return (
                  <div key={title} className="flex gap-5 p-6 rounded-2xl bg-white border border-[var(--c-border)] hover:border-[#FF2D55]/20 hover:shadow-card-hover transition-all duration-200">
                    <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                      <Icon size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--c-text)] mb-1.5">{title}</h3>
                      <p className="text-[var(--c-muted)] text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CTA */}
        <section className="bg-[#080808] py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-4">{ctaHeadline}</h2>
            <p className="text-white/60 mb-8 leading-relaxed">{ctaSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/restaurants" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#FF2D55,#FF6035)' }}>
                Browse All Places <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white/60 border border-white/10 hover:bg-white/[0.06] hover:text-white transition-all">
                Contact Us <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <div className="h-20 md:h-0" />
      </main>
    </>
  )
}
