'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, Globe, Clock, ArrowLeft, Star } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import MenuViewer from '@/components/restaurant/MenuViewer'
import { StarRating, PriceBadge, Badge, Button, Spinner, Avatar, EmptyState } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

const TABS = ['Info', 'Menu', 'Reviews']

export default function RestaurantPage() {
  const { id }                = useParams()
  const { user, token }       = useAuth()

  const [restaurant, setRestaurant] = useState(null)
  const [reviews,    setReviews]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('Info')

  // Review form state
  const [myRating,  setMyRating]  = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [submitted, setSubmitted] = useState(false)

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
          cuisine_types, price_range, cover_image, opening_hours,
          active_menu, menu_items, restaurant_ratings } = restaurant

  const avgRating   = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || 0

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">

        {/* Back */}
        <Link href="/restaurants" className="inline-flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] mb-5 transition-colors">
          <ArrowLeft size={15} /> All restaurants
        </Link>

        {/* Cover */}
        <div className="relative h-56 md:h-72 rounded-3xl overflow-hidden bg-surface-secondary mb-6">
          {cover_image ? (
            <img src={cover_image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
              <span className="text-7xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {price_range && <PriceBadge range={price_range} />}
              {cuisine_types?.map(c => <Badge key={c} color="gray">{c}</Badge>)}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-[var(--c-text)] mb-2">{name}</h1>
            <div className="flex items-center gap-1.5 text-[var(--c-muted)]">
              <MapPin size={15} />
              <span className="text-sm">{address || `${town}, ${district}, ${province}`}</span>
            </div>
          </div>

          {avgRating > 0 && (
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-4xl font-black text-[var(--c-text)]">{Number(avgRating).toFixed(1)}</span>
                <Star size={24} className="text-amber-400 fill-amber-400" />
              </div>
              <StarRating rating={avgRating} size={16} />
              <p className="text-xs text-[var(--c-muted)] mt-1">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* ── TABS */}
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-2xl mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                tab === t
                  ? 'bg-white text-[var(--c-text)] shadow-sm'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-text)]'
              )}>
              {t}
              {t === 'Reviews' && reviewCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                  {reviewCount > 99 ? '99+' : reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: INFO */}
        {tab === 'Info' && (
          <div className="space-y-6 animate-fade-in">
            {description && (
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--c-text)] mb-2">About</h2>
                <p className="text-[var(--c-muted)] text-sm leading-relaxed">{description}</p>
              </div>
            )}

            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-[var(--c-text)]">Contact & Location</h2>
              {phone && (
                <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-brand-600" />
                  </div>
                  {phone}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Globe size={15} className="text-brand-600" />
                  </div>
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-brand-600" />
                </div>
                <span className="text-[var(--c-muted)]">{address || `${town}, ${district}, ${province}`}</span>
              </div>
            </div>

            {/* Menu items for search context */}
            {menu_items?.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--c-text)] mb-3">Sample menu items</h2>
                <div className="space-y-2">
                  {menu_items.filter(i => i.is_available).map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--c-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--c-text)]">{item.name}</p>
                        {item.category && <p className="text-xs text-[var(--c-muted)]">{item.category}</p>}
                      </div>
                      {item.price && (
                        <span className="text-sm font-semibold text-brand-600">Rs {Number(item.price).toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setTab('Menu')} className="mt-3 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors">
                  View full menu →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MENU */}
        {tab === 'Menu' && (
          <div className="animate-fade-in">
            <MenuViewer pdfUrl={active_menu?.pdf_url} restaurantName={name} />
          </div>
        )}

        {/* ── TAB: REVIEWS */}
        {tab === 'Reviews' && (
          <div className="space-y-5 animate-fade-in">

            {/* Write a review */}
            {!user ? (
              <div className="card p-5 text-center">
                <p className="font-semibold text-[var(--c-text)] mb-2">Sign in to leave a review</p>
                <p className="text-sm text-[var(--c-muted)] mb-4">Share your experience to help others discover great food.</p>
                <Link href="/auth"><Button size="sm">Sign in</Button></Link>
              </div>
            ) : submitted ? (
              <div className="card p-5 text-center bg-green-50 border-green-200">
                <p className="font-semibold text-green-800 mb-1">Review submitted!</p>
                <p className="text-sm text-green-700">Thank you for sharing your experience.</p>
              </div>
            ) : (
              <div className="card p-5">
                <h3 className="font-semibold text-[var(--c-text)] mb-4">Write a review</h3>
                <form onSubmit={submitReview} className="space-y-4">
                  <div>
                    <p className="text-sm text-[var(--c-muted)] mb-2">Your rating</p>
                    <StarRating rating={myRating} size={28} interactive onChange={setMyRating} />
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="What did you think? (optional)"
                    rows={3}
                    className="w-full border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 transition-colors resize-none"
                  />
                  <Button type="submit" disabled={!myRating} loading={submitting} size="md">
                    Submit review
                  </Button>
                </form>
              </div>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews yet" description="Be the first to review this restaurant." />
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <Avatar src={review.profiles?.avatar_url} name={review.profiles?.name || 'User'} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-[var(--c-text)] truncate">{review.profiles?.name || 'Anonymous'}</p>
                          <StarRating rating={review.rating} size={13} />
                        </div>
                        <p className="text-xs text-[var(--c-muted)]">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                        </p>
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-[var(--c-muted)] leading-relaxed pl-12">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </>
  )
}
