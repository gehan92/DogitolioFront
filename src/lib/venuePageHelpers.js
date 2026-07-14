import { isUuid, categoryUrlSegment } from './venueUrl'

export const BASE_URL = 'https://www.mealhere.com'

const SCHEMA_TYPE = {
  restaurant: 'Restaurant',
  hotel:      'Hotel',
  snack_bar:  'FoodEstablishment',
  food_shop:  'FoodEstablishment',
}

// `param` is whatever came through the URL's dynamic segment — either a
// legacy raw UUID (old shared link) or the current readable slug.
export async function fetchVenueByParam(param) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const path = isUuid(param) ? `/api/restaurants/${param}` : `/api/restaurants/by-slug/${param}`
    const res  = await fetch(`${base}${path}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function canonicalVenuePath(restaurant) {
  return `/${categoryUrlSegment(restaurant.category)}/${restaurant.slug}`
}

export function buildVenueMetadata(restaurant, canonicalPath) {
  const { name, description, town, district, cuisine_types, cover_image } = restaurant
  const cuisineList = Array.isArray(cuisine_types) ? cuisine_types
    : (typeof cuisine_types === 'string' && cuisine_types ? cuisine_types.split(',').map(s => s.trim()) : [])

  const place = town || district || 'Sri Lanka'
  const metaDescription = (description && description.trim())
    ? description.trim().slice(0, 155)
    : `${name} in ${place}${cuisineList.length ? ` — ${cuisineList.slice(0, 3).join(', ')}` : ''}. View the menu, prices, opening hours, reviews and contact info on MealHere.`

  const title = `${name} — ${place}`
  const url   = `${BASE_URL}${canonicalPath}`
  const image = cover_image || `${BASE_URL}/opengraph-image.png`

  return {
    title,
    description: metaDescription,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      url,
      siteName: 'MealHere',
      title: `${title} | MealHere`,
      description: metaDescription,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | MealHere`,
      description: metaDescription,
      images: [image],
    },
  }
}

export function buildVenueJsonLd(restaurant, canonicalPath) {
  const { name, description, address, town, district, province, phone,
          price_range, cover_image, cuisine_types, restaurant_ratings, category } = restaurant

  const cuisineList = Array.isArray(cuisine_types) ? cuisine_types
    : (typeof cuisine_types === 'string' && cuisine_types ? cuisine_types.split(',').map(s => s.trim()) : [])

  const avgRating   = restaurant_ratings?.[0]?.avg_rating || 0
  const reviewCount = restaurant_ratings?.[0]?.review_count || 0

  return {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE[category] || 'Restaurant',
    name,
    description: description || undefined,
    image: cover_image || undefined,
    url: `${BASE_URL}${canonicalPath}`,
    telephone: phone || undefined,
    priceRange: price_range || undefined,
    servesCuisine: cuisineList.length ? cuisineList : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address || undefined,
      addressLocality: town || undefined,
      addressRegion: province || district || undefined,
      addressCountry: 'LK',
    },
    ...(avgRating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: reviewCount || 1,
      },
    } : {}),
  }
}
