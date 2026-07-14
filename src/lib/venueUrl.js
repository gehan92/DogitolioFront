// Maps a venue's `category` column to its top-level URL segment.
const CATEGORY_URL_SEGMENT = {
  restaurant: 'restaurants',
  hotel:      'hotels',
  snack_bar:  'snackbars',
  food_shop:  'foodshops',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function categoryUrlSegment(category) {
  return CATEGORY_URL_SEGMENT[category] || 'restaurants'
}

// e.g. { category: 'hotel', slug: 'grand-hotel-kandy-4f2a9b3c' } -> '/hotels/grand-hotel-kandy-4f2a9b3c'
export function buildVenueUrl(venue) {
  const segment = categoryUrlSegment(venue.category)
  return `/${segment}/${venue.slug || venue.id}`
}

export function isUuid(value) {
  return UUID_RE.test(value)
}
