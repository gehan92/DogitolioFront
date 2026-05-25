'use client'
import Link from 'next/link'
import { MapPin, UtensilsCrossed } from 'lucide-react'
import { StarRating, PriceBadge, Badge } from '@/components/ui'
import clsx from 'clsx'

export default function RestaurantCard({ restaurant, className }) {
  const { id, name, description, town, district, cover_image,
          cuisine_types: cuisine_types_raw, price_range, restaurant_ratings } = restaurant

  const cuisine_types = Array.isArray(cuisine_types_raw) ? cuisine_types_raw
    : (typeof cuisine_types_raw === 'string' && cuisine_types_raw ? cuisine_types_raw.split(',').map(s => s.trim()) : [])

  const rating      = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || 0

  return (
    <Link href={`/restaurants/${id}`} className={clsx('card block overflow-hidden group', className)}>
      {/* Cover image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {cover_image ? (
          <img src={cover_image} alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#FF2D55 0%,#FF6035 100%)' }}>
            {/* subtle pattern */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <UtensilsCrossed size={44} className="text-white/60" strokeWidth={1.2} />
          </div>
        )}
        {/* gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
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
