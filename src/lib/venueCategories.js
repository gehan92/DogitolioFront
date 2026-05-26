// Single source of truth for venue category configuration.
// No React imports here — components import icons independently.

export const VENUE_CATEGORIES = {
  restaurant: {
    label:         'Restaurants',
    singularLabel: 'Restaurant',
    slug:          'restaurant',
    accentColor:   '#FF2D55',
    gradientFrom:  '#FF2D55',
    gradientTo:    '#FF6035',
    priceLabel:    'Price range',
    reviewPrompt:  'Be the first to review this restaurant.',
    emptyMessage:  'No restaurants found',
    features: {
      menus:        true,
      menuItems:    true,
      cuisineTypes: true,
      starRating:   false,
      amenities:    false,
    },
  },

  hotel: {
    label:         'Hotels',
    singularLabel: 'Hotel',
    slug:          'hotel',
    accentColor:   '#0EA5E9',
    gradientFrom:  '#0EA5E9',
    gradientTo:    '#06B6D4',
    priceLabel:    'Price range',
    reviewPrompt:  'Be the first to review this hotel.',
    emptyMessage:  'No hotels found',
    features: {
      menus:        true,
      menuItems:    false,
      cuisineTypes: false,
      starRating:   true,
      amenities:    true,
    },
  },

  snack_bar: {
    label:         'Snack Bars',
    singularLabel: 'Snack Bar',
    slug:          'snack_bar',
    accentColor:   '#F59E0B',
    gradientFrom:  '#F59E0B',
    gradientTo:    '#FBBF24',
    priceLabel:    'Price range',
    reviewPrompt:  'Be the first to review this snack bar.',
    emptyMessage:  'No snack bars found',
    features: {
      menus:        true,
      menuItems:    true,
      cuisineTypes: true,
      starRating:   false,
      amenities:    false,
    },
  },

  food_shop: {
    label:         'Food Shops',
    singularLabel: 'Food Shop',
    slug:          'food_shop',
    accentColor:   '#059669',
    gradientFrom:  '#059669',
    gradientTo:    '#10B981',
    priceLabel:    'Price range',
    reviewPrompt:  'Be the first to review this food shop.',
    emptyMessage:  'No food shops found',
    features: {
      menus:        false,
      menuItems:    true,
      cuisineTypes: false,
      starRating:   false,
      amenities:    false,
    },
  },
}

export function getCategoryConfig(slug) {
  return VENUE_CATEGORIES[slug] ?? VENUE_CATEGORIES.restaurant
}

export const ALL_CATEGORY_SLUGS = Object.keys(VENUE_CATEGORIES)
