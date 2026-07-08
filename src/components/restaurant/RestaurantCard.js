'use client'
import Link from 'next/link'
import { MapPin, UtensilsCrossed, Building2, Coffee, ShoppingBag, Zap } from 'lucide-react'
import { StarRating, PriceBadge, Badge } from '@/components/ui'
import { getCategoryConfig } from '@/lib/venueCategories'
import { isRestaurantOpenNow } from '@/lib/restaurantHours'
import clsx from 'clsx'

const CATEGORY_ICONS = {
  restaurant: UtensilsCrossed,
  hotel:      Building2,
  snack_bar:  Coffee,
  food_shop:  ShoppingBag,
}

function isBoostActive(venue) {
  if (!venue.is_boosted) return false
  if (!venue.boost_expires_at) return true
  return new Date(venue.boost_expires_at) > new Date()
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`
}

export default function RestaurantCard({ restaurant: venue, className }) {
  const {
    id, name, description, town, district, cover_image,
    cuisine_types: cuisine_types_raw, price_range, restaurant_ratings, category,
  } = venue

  const categoryConfig  = getCategoryConfig(category)
  const PlaceholderIcon = CATEGORY_ICONS[category] || UtensilsCrossed
  const boosted         = isBoostActive(venue)

  const cuisine_types = Array.isArray(cuisine_types_raw)
    ? cuisine_types_raw
    : (typeof cuisine_types_raw === 'string' && cuisine_types_raw
        ? cuisine_types_raw.split(',').map(s => s.trim())
        : [])

  const rating      = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || 0
  const openStatus  = isRestaurantOpenNow(venue.opening_time, venue.closing_time, venue.is_closed_override)

  return (
    <Link
      href={`/restaurants/${id}`}
      className={clsx('card block overflow-hidden group relative', boosted && 'ring-2 ring-amber-400 ring-offset-1', className)}
    >
      {/* Cover image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {cover_image ? (
          <img
            src={cover_image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full relative flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${categoryConfig.gradientFrom},${categoryConfig.gradientTo})` }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
            <PlaceholderIcon size={44} className="text-white/60" strokeWidth={1.2} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Featured badge */}
        {boosted && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}
          >
            <Zap size={10} className="fill-white" />
            Featured
          </div>
        )}

        {/* Category badge — only shown when listing "All Places" (no filter active) */}
        {category && category !== 'restaurant' && !boosted && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow"
            style={{ background: categoryConfig.accentColor }}
          >
            {categoryConfig.singularLabel}
          </div>
        )}

        {price_range && (
          <div className="absolute top-3 right-3">
            <PriceBadge range={price_range} />
          </div>
        )}

        {openStatus !== null && (
          <div
            className={clsx(
              'absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow',
              openStatus ? 'bg-green-500 text-white' : 'bg-gray-800/90 text-white'
            )}
          >
            <span className={clsx('w-1.5 h-1.5 rounded-full', openStatus ? 'bg-white' : 'bg-red-400')} />
            {openStatus ? 'Open now' : 'Closed'}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3 className="font-display font-bold text-lg text-[var(--c-text)] leading-tight mb-1 group-hover:text-brand-600 transition-colors line-clamp-2">
          {name}
        </h3>

        <div className="flex items-center gap-1 text-[var(--c-muted)] text-sm mb-2 min-w-0">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{town}{district ? `, ${district}` : ''}</span>
          {typeof venue.distance_km === 'number' && (
            <span className="shrink-0 text-xs font-semibold text-brand-600">· {formatDistance(venue.distance_km)}</span>
          )}
        </div>

        {rating > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <StarRating rating={rating} size={14} />
            <span className="text-sm font-semibold text-[var(--c-text)]">{Number(rating).toFixed(1)}</span>
            <span className="text-xs text-[var(--c-muted)]">({reviewCount})</span>
          </div>
        )}

        {/* Show cuisine tags for categories that use them */}
        {cuisine_types?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cuisine_types.slice(0, 3).map(c => (
              <Badge key={c} color="gray" className="text-[11px]">{c}</Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
