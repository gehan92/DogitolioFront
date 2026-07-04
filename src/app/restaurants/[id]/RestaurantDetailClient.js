'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, Globe, Clock, ArrowLeft, Star, X,
  UtensilsCrossed, MessageSquare, Info as InfoIcon,
  ChevronRight, ChevronLeft, ThumbsUp, Navigation, Zap, Wrench,
  Images,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/layout/Navbar'
const MenuViewer = dynamic(() => import('@/components/restaurant/MenuViewer'), { ssr: false })
import { PriceBadge, Spinner, Button } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { getCategoryConfig } from '@/lib/venueCategories'
import clsx from 'clsx'

const TABS = [
  { key: 'menu',    label: 'Menu',    icon: UtensilsCrossed },
  { key: 'info',    label: 'Info',    icon: InfoIcon },
  { key: 'reviews', label: 'Reviews', icon: MessageSquare },
]

/* ── Stars component */
function Stars({ rating, size = 16, interactive = false, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={clsx(
            'transition-colors duration-100',
            interactive ? 'cursor-pointer' : 'cursor-default',
            (interactive ? (hover || rating) : rating) >= n
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-200 fill-gray-200'
          )}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(n)}
        />
      ))}
    </div>
  )
}

/* ── Horizontal rating bar */
function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-4 text-right text-gray-400 shrink-0">{count}</span>
    </div>
  )
}

/* ── Menu item detail modal ── */
function MenuItemModal({ item, color, onClose }) {
  const [activePortion, setActivePortion] = useState(0)
  if (!item) return null

  const hasPortions = Array.isArray(item.portions) && item.portions.length > 0
  const salePrice = (() => {
    if (!item.discount_type || !item.discount_value || !item.price) return null
    if (item.discount_type === 'percent') return item.price * (1 - item.discount_value / 100)
    if (item.discount_type === 'fixed')   return item.price - item.discount_value
    return null
  })()
  const ingredients = item.ingredients
    ? item.ingredients.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white overflow-hidden max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo or placeholder — always the same shape */}
        <div className="relative h-56 shrink-0 bg-gray-100">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: `${color}14` }}>
              <UtensilsCrossed size={40} style={{ color }} strokeWidth={1.5} />
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable if long */}
        <div className="p-5 overflow-y-auto">
          <h3 className="font-black text-gray-900 text-xl leading-snug mb-2">{item.name}</h3>

          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.description}</p>
          )}

          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {ingredients.map((ing, i) => (
                <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100 font-medium">
                  {ing}
                </span>
              ))}
            </div>
          )}

          {hasPortions ? (
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {item.portions.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePortion(i)}
                    className={clsx(
                      'px-4 py-2 rounded-xl text-sm font-bold border transition-colors',
                      activePortion === i ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                    style={activePortion === i ? { background: color } : {}}
                  >
                    {p.size}
                  </button>
                ))}
              </div>
              <p className="text-2xl font-black" style={{ color }}>
                Rs. {Number(item.portions[activePortion]?.price || 0).toLocaleString()}
              </p>
            </div>
          ) : item.price ? (
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black" style={{ color }}>
                Rs. {Math.round(salePrice ?? item.price).toLocaleString()}
              </span>
              {salePrice && (
                <span className="text-sm text-gray-400 line-through mb-1">
                  Rs. {Number(item.price).toLocaleString()}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ── Visual menu grouped by category */
function MenuSection({ items, brandColor }) {
  const color = brandColor || '#FF2D55'
  const available = items || []
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedItem,   setSelectedItem]   = useState(null)

  const groups = available.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
  const categories = Object.keys(groups)
  const shown = activeCategory || categories[0]

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <UtensilsCrossed size={28} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Menu coming soon</p>
        <p className="text-sm text-gray-400">This place hasn&apos;t uploaded their menu yet.</p>
      </div>
    )
  }

  function discountedPrice(item) {
    if (!item.discount_type || !item.discount_value || !item.price) return null
    if (item.discount_type === 'percent') return item.price * (1 - item.discount_value / 100)
    if (item.discount_type === 'fixed')   return item.price - item.discount_value
    return null
  }

  return (
    <div>
      {/* ── Sticky category tab bar */}
      {categories.length > 1 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-1 pb-3 mb-4"
          style={{ background: 'var(--c-bg, #f9fafb)', backdropFilter: 'blur(12px)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border',
                  shown === cat
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                )}
                style={shown === cat ? { background: color, borderColor: color } : {}}
              >
                {cat}
                <span className={clsx(
                  'text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none',
                  shown === cat ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'
                )}>
                  {groups[cat].length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Category heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-base tracking-tight">{shown}</h3>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
            {groups[shown]?.length} item{groups[shown]?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {/* ── Menu grid — 1 col mobile, 2 col tablet, 3 col desktop, uniform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups[shown]?.map(item => {
          const salePrice = discountedPrice(item)
          const hasPortions = Array.isArray(item.portions) && item.portions.length > 0
          const ingredients = item.ingredients
            ? item.ingredients.split(',').map(s => s.trim()).filter(Boolean)
            : []
          const shownIngredients = ingredients.slice(0, 3)
          const extraIngredients = ingredients.length - shownIngredients.length
          const lowestPortionPrice = hasPortions
            ? Math.min(...item.portions.map(p => Number(p.price) || 0))
            : null

          return (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="flex flex-col text-left gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group h-full"
            >
              {/* ── Photo or placeholder — always the same shape, keeps every card uniform */}
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-50 shrink-0">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `${color}0f` }}>
                    <UtensilsCrossed size={26} style={{ color }} strokeWidth={1.5} />
                  </div>
                )}
                {salePrice && !hasPortions && (
                  <span className="absolute top-2 right-2 text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-sm"
                    style={{ background: color }}>
                    {item.discount_type === 'percent' ? `${item.discount_value}% OFF` : `Rs.${item.discount_value} OFF`}
                  </span>
                )}
              </div>

              {/* ── Details */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">{item.name}</p>

                {item.description && (
                  <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
                )}

                {shownIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shownIngredients.map((ing, i) => (
                      <span key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 font-medium">
                        {ing}
                      </span>
                    ))}
                    {extraIngredients > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100 font-medium">
                        +{extraIngredients} more
                      </span>
                    )}
                  </div>
                )}

                {/* Price — condensed; full breakdown shown in the detail popup */}
                <div className="mt-auto pt-1">
                  {hasPortions ? (
                    <span className="text-[15px] font-black" style={{ color }}>
                      From Rs. {lowestPortionPrice.toLocaleString()}
                    </span>
                  ) : item.price ? (
                    <div className="flex items-end gap-2">
                      <span className="text-[16px] font-black leading-none" style={{ color }}>
                        Rs. {Math.round(salePrice ?? item.price).toLocaleString()}
                      </span>
                      {salePrice && (
                        <span className="text-[11px] text-gray-400 line-through leading-none mb-0.5">
                          Rs. {Number(item.price).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-8 pb-2">
        Prices may vary. Contact the restaurant to confirm.
      </p>

      <MenuItemModal item={selectedItem} color={color} onClose={() => setSelectedItem(null)} />
    </div>
  )
}

function FloatingCallButton({ phone, color }) {
  const [barVisible, setBarVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setBarVisible(y < 80 || y < lastScrollY.current)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <a
      href={`tel:${phone}`}
      className="lg:hidden fixed bottom-16 left-3 right-3 z-30 flex items-center justify-between px-6 py-4 rounded-2xl text-white"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        boxShadow: `0 4px 24px ${color}45`,
        transform: barVisible ? 'translateY(0)' : 'translateY(calc(100% + 80px))',
        opacity: barVisible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Phone size={16} />
        <span className="text-[13px] font-bold">Call Restaurant</span>
      </div>
      <span className="text-[12px] font-semibold text-white/80">{phone}</span>
    </a>
  )
}

export default function RestaurantDetailClient() {
  const { id }          = useParams()
  const { user, token } = useAuth()

  const [restaurant, setRestaurant] = useState(null)
  const [reviews,    setReviews]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('menu')

  const [myRating,   setMyRating]   = useState(0)
  const [myComment,  setMyComment]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [gallery,       setGallery]       = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [rest, revs] = await Promise.all([
          api.restaurants.get(id),
          api.restaurants.reviews(id, { limit: 20 }),
        ])
        setRestaurant(rest)
        setReviews(revs.data || [])
        api.gallery.list(id).then(gal => setGallery(gal?.data || [])).catch(() => {})
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft')  setLightboxIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(gallery.length - 1, i + 1))
      if (e.key === 'Escape')     setLightboxIndex(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, gallery.length])

  async function submitReview(e) {
    e.preventDefault()
    if (!myRating) return
    setSubmitting(true)
    try {
      const newReview = await api.reviews.create(
        { restaurant_id: id, rating: myRating, comment: myComment },
        token
      )
      setReviews(r => [newReview, ...r])
      setSubmitted(true)
      setMyComment('')
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size={32} />
      </div>
    </>
  )

  if (!restaurant) return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-2xl font-display font-bold mb-4">Restaurant not found</p>
        <Link href="/restaurants"><Button variant="secondary">Back to restaurants</Button></Link>
      </div>
    </>
  )

  const { name, description, address, town, district, province, phone, website,
          cuisine_types: cuisine_types_raw, price_range, cover_image, open_hours,
          menu_items, menu_url, restaurant_ratings, brand_color, google_maps_embed,
          is_boosted, boost_expires_at, category, category_meta } = restaurant

  const cuisine_types = Array.isArray(cuisine_types_raw) ? cuisine_types_raw
    : (typeof cuisine_types_raw === 'string' && cuisine_types_raw ? cuisine_types_raw.split(',').map(s => s.trim()) : [])

  const categoryConfig = getCategoryConfig(category)
  const color = brand_color || categoryConfig.accentColor

  const boostActive = is_boosted && (!boost_expires_at || new Date(boost_expires_at) > new Date())

  const avgRating   = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || reviews.length

  // Rating distribution from loaded reviews
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach(r => { if (dist[r.rating] !== undefined) dist[r.rating]++ })

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-36 md:pb-10">

        {/* Back */}
        <Link
          href={`/restaurants${category && category !== 'restaurant' ? `?category=${category}` : ''}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors font-medium"
        >
          <ArrowLeft size={14} /> All {categoryConfig.label}
        </Link>

        {/* Cover hero */}
        <div className="relative h-56 md:h-80 rounded-3xl overflow-hidden mb-6 bg-gray-100">
          {cover_image
            ? <img src={cover_image} alt={name} className="w-full h-full object-cover" />
            : <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}
              >
                <UtensilsCrossed size={48} className="text-white/50" strokeWidth={1} />
              </div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {boostActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white shadow"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
                  <Zap size={10} className="fill-white" /> Featured
                </span>
              )}
              {/* Category label badge for non-restaurants */}
              {category && category !== 'restaurant' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm">
                  {categoryConfig.singularLabel}
                </span>
              )}
              {/* Hotel star rating from category_meta */}
              {categoryConfig.features.starRating && category_meta?.star_rating && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/90 text-[11px] font-black text-white">
                  {'★'.repeat(category_meta.star_rating)} {category_meta.star_rating}-Star
                </span>
              )}
              {price_range && <PriceBadge range={price_range} />}
              {categoryConfig.features.cuisineTypes && cuisine_types?.slice(0, 3).map(c => (
                <span key={c} className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold">{c}</span>
              ))}
            </div>
            <h1 className="text-white font-black text-2xl md:text-3xl leading-tight drop-shadow-md">{name}</h1>
            <div className="flex items-center gap-1.5 text-white/75 text-sm mt-1">
              <MapPin size={13} /> <span>{town}{district && town !== district ? `, ${district}` : ''}</span>
            </div>
          </div>
        </div>

        {/* ── Photo gallery mosaic */}
        {gallery.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden mb-6 bg-gray-100 h-40 sm:h-52 md:h-56">
            <div className="flex gap-0.5 h-full">
              {/* Main large photo */}
              <div
                className="flex-[3] relative overflow-hidden group cursor-pointer"
                onClick={() => setLightboxIndex(0)}
              >
                <img
                  src={gallery[0].image_url}
                  alt={gallery[0].caption || name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Side thumbnails */}
              {gallery.length > 1 && (
                <div className="flex-[2] flex flex-col gap-0.5">
                  {gallery.slice(1, 3).map((img, idx) => {
                    const isLastWithMore = idx === 1 && gallery.length > 3
                    return (
                      <div
                        key={img.id}
                        className="flex-1 relative overflow-hidden group cursor-pointer"
                        onClick={() => setLightboxIndex(idx + 1)}
                      >
                        <img
                          src={img.image_url}
                          alt={img.caption || name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {isLastWithMore && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-white font-black text-2xl leading-none">+{gallery.length - 3}</p>
                              <p className="text-white/75 text-xs font-semibold mt-0.5">more</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* See all photos pill */}
            <button
              onClick={() => setLightboxIndex(0)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-sm text-[12px] font-bold text-gray-900 shadow-lg hover:bg-white transition-colors duration-150"
            >
              <Images size={12} />
              See all {gallery.length} photo{gallery.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Maintenance / Under-construction banner */}
        {category_meta?.under_maintenance && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200 mb-5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Wrench size={17} className="text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-orange-800 text-sm">Temporarily under maintenance</p>
              <p className="text-sm text-orange-700 mt-0.5">
                {category_meta?.maintenance_message || 'This venue is currently undergoing maintenance and may have limited availability. Please check back soon or contact them directly.'}
              </p>
            </div>
          </div>
        )}

        {/* Rating summary */}
        {avgRating > 0 && (
          <div className="flex items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-2xl border mb-5" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="text-center shrink-0 px-1 sm:px-2">
            <div className="text-4xl sm:text-5xl font-black leading-none mb-1.5" style={{ color: 'var(--c-text)' }}>{Number(avgRating).toFixed(1)}</div>
              <Stars rating={Math.round(avgRating)} size={14} />
              <p className="text-[11px] text-gray-400 mt-1.5">{reviews.length || reviewCount} reviews</p>
            </div>
            <div className="w-px h-16 shrink-0" style={{ background: 'var(--c-border)' }} />
            <div className="flex-1 space-y-1.5 min-w-0">
              {[5, 4, 3, 2, 1].map(n => (
                <RatingBar key={n} label={n} count={dist[n]} total={reviews.length || 1} />
              ))}
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--c-surface2)' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150',
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}>
              <Icon size={14} />{label}
              {key === 'reviews' && reviewCount > 0 && (
                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 text-white"
                  style={{ background: color }}>
                  {reviewCount > 99 ? '99+' : reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Menu tab */}
        {tab === 'menu' && (
          <div className="animate-fade-in">
            {restaurant.active_menu?.pdf_url
              ? <MenuViewer pdfUrl={restaurant.active_menu.pdf_url} restaurantName={name} />
              : <MenuSection items={menu_items} brandColor={color} />
            }
          </div>
        )}

        {/* ── Info tab */}
        {tab === 'info' && (
          <div className="space-y-4 animate-fade-in">
            {description && (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-2">About</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-white border border-gray-100 space-y-4">
              <h2 className="font-bold text-gray-900">Contact &amp; Hours</h2>
              {open_hours && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--c-brand-lt)' }}>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Opening hours</p>
                    <p className="text-sm text-gray-700 font-semibold">{open_hours}</p>
                  </div>
                </div>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--c-brand-lt)' }}>
                    <Phone size={16} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Phone</p>
                    <p className="text-sm text-gray-700 font-semibold group-hover:text-[#FF2D55] transition-colors">{phone}</p>
                  </div>
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--c-brand-lt)' }}>
                    <Globe size={16} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Website</p>
                    <p className="text-sm text-gray-700 font-semibold group-hover:text-[#FF2D55] transition-colors break-all">{website.replace(/^https?:\/\//, '')}</p>
                  </div>
                </a>
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--c-brand-lt)' }}>
                  <MapPin size={16} style={{ color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Address</p>
                  <p className="text-sm text-gray-700 font-semibold">{address || `${town}, ${district}, ${province}`}</p>
                </div>
              </div>
            </div>

            {/* Google Maps embed */}
            {google_maps_embed && (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900">Location</h2>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${name} ${town} Sri Lanka`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: color }}>
                    <Navigation size={12} /> Get directions
                  </a>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 260 }}>
                  <iframe
                    src={google_maps_embed}
                    width="100%" height="260"
                    style={{ border: 0 }}
                    allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Restaurant location"
                  />
                </div>
              </div>
            )}

            {/* Cuisine types — only for restaurants and snack bars */}
            {categoryConfig.features.cuisineTypes && cuisine_types?.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-3">Cuisine types</h2>
                <div className="flex flex-wrap gap-2">
                  {cuisine_types.map(c => (
                    <span key={c} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-50 text-gray-600">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Hotel amenities — from category_meta */}
            {categoryConfig.features.amenities && category_meta?.amenities?.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {category_meta.amenities.map(amenity => (
                    <span key={amenity} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-50 text-gray-600 capitalize">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hotel check-in / check-out */}
            {categoryConfig.features.amenities && (category_meta?.check_in || category_meta?.check_out) && (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-3">Check-in &amp; Check-out</h2>
                <div className="flex gap-6">
                  {category_meta.check_in && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Check-in</p>
                      <p className="text-sm font-bold text-gray-900">{category_meta.check_in}</p>
                    </div>
                  )}
                  {category_meta.check_out && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Check-out</p>
                      <p className="text-sm font-bold text-gray-900">{category_meta.check_out}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hotel booking link */}
            {categoryConfig.features.amenities && category_meta?.booking_url && (
              <a
                href={category_meta.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-black text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}
              >
                Book a Room
              </a>
            )}
          </div>
        )}

        {/* ── Reviews tab */}
        {tab === 'reviews' && (
          <div className="space-y-4 animate-fade-in">

            {/* Write a review */}
            {!user ? (
              <div className="p-6 rounded-2xl border text-center" style={{ background: 'var(--c-surface2)', borderColor: 'var(--c-border)' }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--c-brand-lt)' }}>
                  <MessageSquare size={22} style={{ color: '#FF2D55' }} />
                </div>
                <p className="font-bold text-gray-900 mb-1">Sign in to leave a review</p>
                <p className="text-sm text-gray-400 mb-4">Share your experience and help others find great places.</p>
                <Link href="/auth"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: color, boxShadow: `0 2px 12px ${color}40` }}>
                  Sign in
                </Link>
              </div>
            ) : submitted ? (
              <div className="p-5 rounded-2xl border border-green-200 text-center bg-green-50">
                <p className="font-bold text-green-800 mb-1">Review submitted!</p>
                <p className="text-sm text-green-600">Thank you for sharing your experience.</p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Write a review</h3>
                <form onSubmit={submitReview} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2 font-medium">Your rating</p>
                    <Stars rating={myRating} size={30} interactive onChange={setMyRating} />
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="What did you think? (optional)"
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none border border-gray-200 focus:border-[#FF2D55] transition-colors bg-gray-50"
                  />
                  <button
                    type="submit"
                    disabled={!myRating || submitting}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: color }}>
                    {submitting ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              </div>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No reviews yet</p>
                <p className="text-sm text-gray-400">{categoryConfig.reviewPrompt}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => {
                  const initials = (review.profiles?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={review.id} className="p-4 rounded-2xl bg-white border border-gray-100">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black"
                          style={{ background: color }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-gray-900 truncate">{review.profiles?.name || 'Anonymous'}</p>
                            <Stars rating={review.rating} size={12} />
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-gray-500 leading-relaxed pl-[52px]">{review.comment}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={20} />
          </button>

          {/* Prev arrow */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => i - 1) }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Image + caption + counter */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={gallery[lightboxIndex]?.image_url}
              alt={gallery[lightboxIndex]?.caption || name}
              className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
            />
            {gallery[lightboxIndex]?.caption && (
              <p className="text-white/70 text-sm text-center px-4">{gallery[lightboxIndex].caption}</p>
            )}
            <p className="text-white/40 text-xs font-semibold tracking-wider">
              {lightboxIndex + 1} / {gallery.length}
            </p>
          </div>

          {/* Next arrow */}
          {lightboxIndex < gallery.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => i + 1) }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto px-4 pb-1">
              {gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i) }}
                  className={clsx(
                    'shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-150',
                    i === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
                  )}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Floating call button */}
      {phone && tab === 'menu' && <FloatingCallButton phone={phone} color={color} />}
    </>
  )
}
