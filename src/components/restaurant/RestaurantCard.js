'use client'
import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { StarRating, PriceBadge, Badge } from '@/components/ui'
import clsx from 'clsx'

export default function RestaurantCard({ restaurant, className }) {
  const { id, name, description, town, district, cover_image,
          cuisine_types, price_range, restaurant_ratings } = restaurant

  const rating      = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || 0

  return (
    <Link href={`/restaurants/${id}`} className={clsx('card block overflow-hidden group', className)}>
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden bg-surface-secondary">
        {cover_image ? (
          <img src={cover_image} alt={name} fill
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        {price_range && (
          <div className="absolute top-3 right-3">
            <PriceBadge range={price_range} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-bold text-lg text-[var(--c-text)] leading-tight mb-1 group-hover:text-brand-600 transition-colors">
          {name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-[var(--c-muted)] text-sm mb-2">
          <MapPin size={13} />
          <span>{town}, {district}</span>
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <StarRating rating={rating} size={14} />
            <span className="text-sm font-semibold text-[var(--c-text)]">{Number(rating).toFixed(1)}</span>
            <span className="text-xs text-[var(--c-muted)]">({reviewCount})</span>
          </div>
        )}

        {/* Cuisine tags */}
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
