'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Phone, Globe, Clock, ArrowLeft, Star,
  UtensilsCrossed, MessageSquare, Info as InfoIcon,
  ChevronRight, ThumbsUp, Navigation, Zap,
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

/* ── Visual menu grouped by category */
function MenuSection({ items, brandColor }) {
  const color = brandColor || '#FF2D55'
  const available = items || []
  const [activeCategory, setActiveCategory] = useState(null)

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
      {/* Category pill tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
              shown === cat ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
            style={shown === cat ? { background: color } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {groups[shown]?.map(item => {
          const salePrice = discountedPrice(item)
          return (
            <div key={item.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-all duration-150"
              style={{ borderColor: salePrice ? `${color}22` : undefined }}>
              {/* Photo */}
              {item.photo_url && (
                <img src={item.photo_url} alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-[15px] leading-tight">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  {item.price && (
                    <div className="text-right shrink-0">
                      {salePrice ? (
                        <>
                          <span className="text-[13px] text-gray-400 line-through block">Rs. {Number(item.price).toLocaleString()}</span>
                          <span className="text-[15px] font-black block" style={{ color }}>Rs. {Math.round(salePrice).toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                            style={{ background: color }}>
                            {item.discount_type === 'percent' ? `${item.discount_value}% OFF` : `Rs.${item.discount_value} OFF`}
                          </span>
                        </>
                      ) : (
                        <span className="text-[15px] font-black" style={{ color }}>Rs. {Number(item.price).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 text-center mt-6">
        Prices may vary. Contact the restaurant to confirm.
      </p>
    </div>
  )
}

export default function RestaurantPage() {
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

  useEffect(() => {
    async function load() {
      try {
        const [rest, revs] = await Promise.all([
          api.restaurants.get(id),
          api.restaurants.reviews(id, { limit: 20 }),
        ])
        setRestaurant(rest)
        setReviews(revs.data || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

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
      <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">

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

        {/* Rating summary */}
        {avgRating > 0 && (
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-gray-100 mb-5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div className="text-center shrink-0 px-2">
              <div className="text-5xl font-black text-gray-900 leading-none mb-1.5">{Number(avgRating).toFixed(1)}</div>
              <Stars rating={Math.round(avgRating)} size={14} />
              <p className="text-[11px] text-gray-400 mt-1.5">{reviews.length || reviewCount} reviews</p>
            </div>
            <div className="w-px h-16 bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              {[5, 4, 3, 2, 1].map(n => (
                <RatingBar key={n} label={n} count={dist[n]} total={reviews.length || 1} />
              ))}
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: '#f5f5f5' }}>
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
            {menu_url
              ? <MenuViewer pdfUrl={menu_url} restaurantName={name} />
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
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff0f3' }}>
                    <Clock size={16} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Opening hours</p>
                    <p className="text-sm text-gray-700 font-semibold">{open_hours}</p>
                  </div>
                </div>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff0f3' }}>
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
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff0f3' }}>
                    <Globe size={16} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Website</p>
                    <p className="text-sm text-gray-700 font-semibold group-hover:text-[#FF2D55] transition-colors break-all">{website.replace(/^https?:\/\//, '')}</p>
                  </div>
                </a>
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff0f3' }}>
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
              <div className="p-6 rounded-2xl bg-white border border-gray-100 text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#fff0f3' }}>
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
              <div className="p-5 rounded-2xl border text-center" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
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
    </>
  )
}
