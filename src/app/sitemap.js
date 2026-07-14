import { categoryUrlSegment } from '@/lib/venueUrl'

const BASE_URL = 'https://www.mealhere.com'

async function getVenues() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const res = await fetch(`${base}/api/restaurants?limit=1000`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.data || []
    return list.filter(r => r.slug)
  } catch {
    return []
  }
}

export default async function sitemap() {
  const staticRoutes = ['', '/about', '/contact', '/restaurants', '/hotels', '/snackbars', '/foodshops'].map(path => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const venueRoutes = (await getVenues()).map(venue => ({
    url: `${BASE_URL}/${categoryUrlSegment(venue.category)}/${venue.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...venueRoutes]
}
