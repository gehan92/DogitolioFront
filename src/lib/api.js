import { DUMMY_RESTAURANTS, DUMMY_REVIEWS, filterRestaurants, paginateDummy } from './dummyData'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// ── RESTAURANTS
export const api = {
  restaurants: {
    list: async (params = {}) => {
      try { return await apiFetch('/restaurants?' + new URLSearchParams(params)) }
      catch { return filterRestaurants(params) }
    },
    get: async (id) => {
      try { return await apiFetch(`/restaurants/${id}`) }
      catch { return DUMMY_RESTAURANTS.find(r => r.id === String(id)) || null }
    },
    search: async (params = {}) => {
      try { return await apiFetch('/restaurants/search?' + new URLSearchParams(params)) }
      catch { return filterRestaurants(params) }
    },
    reviews: async (id, params) => {
      try { return await apiFetch(`/restaurants/${id}/reviews?` + new URLSearchParams(params)) }
      catch { return { data: DUMMY_REVIEWS.filter(r => r.restaurant_id === String(id)) } }
    },

    // Admin
    create: (data, token) => apiFetch('/restaurants', { method:'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/restaurants/${id}`, { method:'PUT', body: JSON.stringify(data) }, token),
    delete: (id, token)   => apiFetch(`/restaurants/${id}`, { method:'DELETE' }, token),
  },

  menus: {
    upload: (restaurantId, formData, token) =>
      fetch(`${BASE}/api/menus/${restaurantId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData, // FormData — no Content-Type header, browser sets it
      }).then(r => r.json()),
    history: (restaurantId, token) => apiFetch(`/menus/${restaurantId}/history`, {}, token),
    delete:  (menuId, token)       => apiFetch(`/menus/${menuId}`, { method:'DELETE' }, token),
  },

  reviews: {
    create: (data, token)   => apiFetch('/reviews', { method:'POST', body: JSON.stringify(data) }, token),
    update: (id, data, tok) => apiFetch(`/reviews/${id}`, { method:'PUT', body: JSON.stringify(data) }, tok),
    delete: (id, token)     => apiFetch(`/reviews/${id}`, { method:'DELETE' }, token),
  },

  siteContent: {
    get:    (page)         => apiFetch(`/site-content/${page}`),
    update: (page, data, token) => apiFetch(`/site-content/${page}`, { method:'PUT', body: JSON.stringify(data) }, token),
  },

  menuItems: {
    list:   (restaurantId) => apiFetch(`/menu-items/${restaurantId}`),
    create: (restaurantId, formData, token) =>
      fetch(`${BASE}/api/menu-items/${restaurantId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then(r => r.json()),
    update: (id, formData, token) =>
      fetch(`${BASE}/api/menu-items/item/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then(r => r.json()),
    delete: (id, token) => apiFetch(`/menu-items/item/${id}`, { method:'DELETE' }, token),
  },

  admin: {
    stats:      (token)           => apiFetch('/admin/stats', {}, token),
    users:      (params, token)   => apiFetch('/admin/users?' + new URLSearchParams(params), {}, token),
    patchUser:  (id, data, token) => apiFetch(`/admin/users/${id}`, { method:'PATCH', body: JSON.stringify(data) }, token),
    reviews:    (params, token)   => apiFetch('/admin/reviews?' + new URLSearchParams(params), {}, token),
    deleteReview:(id, token)      => apiFetch(`/reviews/admin/${id}`, { method:'DELETE' }, token),
    patchReview: (id, data, token)=> apiFetch(`/reviews/admin/${id}`, { method:'PATCH', body: JSON.stringify(data) }, token),
  },
}
