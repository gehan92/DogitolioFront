import { DUMMY_RESTAURANTS, DUMMY_REVIEWS, filterRestaurants } from './dummyData'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res  = await fetch(`${BASE}/api${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// For multipart FormData uploads — browser sets Content-Type + boundary automatically
async function formFetch(url, token, formData, method = 'POST') {
  const res  = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// ── RESTAURANTS
export const api = {
  restaurants: {
    list:   async (params = {}) => {
      try { return await apiFetch('/restaurants?' + new URLSearchParams(params)) }
      catch { return filterRestaurants(params) }
    },
    get:    async (id) => {
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
    create:       (data, token)         => apiFetch('/restaurants', { method: 'POST', body: JSON.stringify(data) }, token),
    update:       (id, data, token)     => apiFetch(`/restaurants/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete:       (id, token)           => apiFetch(`/restaurants/${id}`, { method: 'DELETE' }, token),
    boost:        (id, data, token)     => apiFetch(`/restaurants/${id}/boost`, { method: 'PUT', body: JSON.stringify(data) }, token),
    boostHistory: (id, token)           => apiFetch(`/restaurants/${id}/boost-history`, {}, token),
  },

  menus: {
    upload:  (restaurantId, formData, token) => formFetch(`${BASE}/api/menus/${restaurantId}`, token, formData),
    history: (restaurantId, token)           => apiFetch(`/menus/${restaurantId}/history`, {}, token),
    delete:  (menuId, token)                 => apiFetch(`/menus/${menuId}`, { method: 'DELETE' }, token),
  },

  reviews: {
    create: (data, token)    => apiFetch('/reviews', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete: (id, token)      => apiFetch(`/reviews/${id}`, { method: 'DELETE' }, token),
  },

  siteContent: {
    get:    (page)              => apiFetch(`/site-content/${page}`),
    update: (page, data, token) => apiFetch(`/site-content/${page}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  },

  menuItems: {
    list:   (restaurantId)                   => apiFetch(`/menu-items/${restaurantId}`),
    create: (restaurantId, formData, token)  => formFetch(`${BASE}/api/menu-items/${restaurantId}`, token, formData),
    update: (id, formData, token)            => formFetch(`${BASE}/api/menu-items/item/${id}`, token, formData, 'PUT'),
    delete: (id, token)                      => apiFetch(`/menu-items/item/${id}`, { method: 'DELETE' }, token),
  },

  // ── OWNER PORTAL
  owner: {
    me:            (token)         => apiFetch('/owner/me', {}, token),
    myRequests:    (params, token) => apiFetch('/owner/change-requests?' + new URLSearchParams(params), {}, token),
    getRequest:    (id, token)     => apiFetch(`/owner/change-requests/${id}`, {}, token),
    createRequest: (data, token)   => apiFetch('/owner/change-requests', { method: 'POST', body: JSON.stringify(data) }, token),
  },

  // ── ADMIN
  admin: {
    stats:       (token)             => apiFetch('/admin/stats', {}, token),

    // Users
    users:       (params, token)     => apiFetch('/admin/users?' + new URLSearchParams(params), {}, token),
    patchUser:   (id, data, token)   => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

    // Reviews
    reviews:      (params, token)    => apiFetch('/admin/reviews?' + new URLSearchParams(params), {}, token),
    deleteReview: (id, token)        => apiFetch(`/reviews/admin/${id}`, { method: 'DELETE' }, token),
    patchReview:  (id, data, token)  => apiFetch(`/reviews/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

    // Audit
    auditLogs:   (params, token)     => apiFetch('/admin/audit-logs?' + new URLSearchParams(params), {}, token),

    // Change Requests
    changeRequests:     (params, token)      => apiFetch('/admin/change-requests?' + new URLSearchParams(params), {}, token),
    getChangeRequest:   (id, token)          => apiFetch(`/admin/change-requests/${id}`, {}, token),
    patchChangeRequest: (id, data, token)    => apiFetch(`/admin/change-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

    // Owners
    owners:       (token)            => apiFetch('/admin/owners', {}, token),
    assignOwner:  (data, token)      => apiFetch('/admin/owners', { method: 'POST', body: JSON.stringify(data) }, token),
    removeOwner:  (id, token)        => apiFetch(`/admin/owners/${id}`, { method: 'DELETE' }, token),

    // Staff
    staff:                   (params, token)            => apiFetch('/admin/staff?' + new URLSearchParams(params), {}, token),
    staffPermissions:        (staffId, token)            => apiFetch(`/admin/staff-permissions/${staffId}`, {}, token),
    updateStaffPermissions:  (staffId, permissions, token) => apiFetch(
      `/admin/staff-permissions/${staffId}`,
      { method: 'PUT', body: JSON.stringify({ permissions }) },
      token
    ),
  },
}
