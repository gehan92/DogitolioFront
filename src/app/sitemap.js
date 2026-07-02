const BASE_URL = 'https://www.mealhere.com'

async function getRestaurantIds() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const res = await fetch(`${base}/api/restaurants?limit=1000`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.data || []
    return list.map(r => r.id).filter(Boolean)
  } catch {
    return []
  }
}

export default async function sitemap() {
  const staticRoutes = ['', '/about', '/contact', '/restaurants'].map(path => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const restaurantRoutes = (await getRestaurantIds()).map(id => ({
    url: `${BASE_URL}/restaurants/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...restaurantRoutes]
}
