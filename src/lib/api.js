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

export const api = {

  // ── RESTAURANTS
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
    verify:       (id, data, token)     => apiFetch(`/restaurants/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    feature:      (id, data, token)     => apiFetch(`/restaurants/${id}/feature`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    approve:      (id, data, token)     => apiFetch(`/restaurants/${id}/approve`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    bulk:         (data, token)         => apiFetch('/restaurants/bulk', { method: 'POST', body: JSON.stringify(data) }, token),
  },

  // ── MENUS
  menus: {
    upload:  (restaurantId, formData, token) => formFetch(`${BASE}/api/menus/${restaurantId}`, token, formData),
    history: (restaurantId, token)           => apiFetch(`/menus/${restaurantId}/history`, {}, token),
    delete:  (menuId, token)                 => apiFetch(`/menus/${menuId}`, { method: 'DELETE' }, token),
  },

  // ── REVIEWS
  reviews: {
    create: (data, token)     => apiFetch('/reviews', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete: (id, token)       => apiFetch(`/reviews/${id}`, { method: 'DELETE' }, token),
  },

  // ── SITE CONTENT
  siteContent: {
    get:    (page)              => apiFetch(`/site-content/${page}`),
    update: (page, data, token) => apiFetch(`/site-content/${page}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  },

  // ── MENU ITEMS
  menuItems: {
    list:   (restaurantId)                  => apiFetch(`/menu-items/${restaurantId}`),
    create: (restaurantId, formData, token) => formFetch(`${BASE}/api/menu-items/${restaurantId}`, token, formData),
    update: (id, formData, token)           => formFetch(`${BASE}/api/menu-items/item/${id}`, token, formData, 'PUT'),
    delete: (id, token)                     => apiFetch(`/menu-items/item/${id}`, { method: 'DELETE' }, token),
  },

  // ── CONTACT
  contact: {
    send: (data) => apiFetch('/contact', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── PROFILE
  profile: {
    me:     (token)       => apiFetch('/profile/me', {}, token),
    update: (data, token) => apiFetch('/profile/me', { method: 'PATCH', body: JSON.stringify(data) }, token),
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
    stats:      (token)         => apiFetch('/admin/stats', {}, token),

    // Users
    users:      (params, token) => apiFetch('/admin/users?' + new URLSearchParams(params), {}, token),
    userCounts: (token)         => apiFetch('/admin/users/counts', {}, token),
    patchUser:  (id, data, token) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    userActivity:(id, token)    => apiFetch(`/admin/users/${id}/activity`, {}, token),
    flagUser:   (id, data, token) => apiFetch(`/admin/users/${id}/flag`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    exportUsers:(params, token) => apiFetch('/admin/users/export?' + new URLSearchParams(params), {}, token),

    // Reviews
    reviews:      (params, token)   => apiFetch('/admin/reviews?' + new URLSearchParams(params), {}, token),
    deleteReview: (id, token)       => apiFetch(`/reviews/admin/${id}`, { method: 'DELETE' }, token),
    patchReview:  (id, data, token) => apiFetch(`/reviews/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

    // Audit
    auditLogs: (params, token) => apiFetch('/admin/audit-logs?' + new URLSearchParams(params), {}, token),

    // Change Requests
    changeRequests:     (params, token)   => apiFetch('/admin/change-requests?' + new URLSearchParams(params), {}, token),
    getChangeRequest:   (id, token)       => apiFetch(`/admin/change-requests/${id}`, {}, token),
    patchChangeRequest: (id, data, token) => apiFetch(`/admin/change-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

    // Owners
    owners:      (token)        => apiFetch('/admin/owners', {}, token),
    assignOwner: (data, token)  => apiFetch('/admin/owners', { method: 'POST', body: JSON.stringify(data) }, token),
    removeOwner: (id, token)    => apiFetch(`/admin/owners/${id}`, { method: 'DELETE' }, token),

    // Staff
    staff:                  (params, token)                => apiFetch('/admin/staff?' + new URLSearchParams(params), {}, token),
    staffPermissions:       (staffId, token)               => apiFetch(`/admin/staff-permissions/${staffId}`, {}, token),
    updateStaffPermissions: (staffId, permissions, token)  => apiFetch(
      `/admin/staff-permissions/${staffId}`,
      { method: 'PUT', body: JSON.stringify({ permissions }) },
      token
    ),
  },

  // ── SUPERADMIN
  superadmin: {
    stats:     (token)            => apiFetch('/superadmin/stats', {}, token),
    users:     (params, token)    => apiFetch('/superadmin/users?' + new URLSearchParams(params), {}, token),
    patchUser: (id, data, token)  => apiFetch(`/superadmin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    auditLogs: (params, token)    => apiFetch('/superadmin/audit-logs?' + new URLSearchParams(params), {}, token),
    writeLog:  (data, token)      => apiFetch('/superadmin/audit-logs', { method: 'POST', body: JSON.stringify(data) }, token),
  },

  // ── HISTORY
  history: {
    restaurantEdits: (params, token) => apiFetch('/history/restaurant-edits?' + new URLSearchParams(params), {}, token),
    logins:          (params, token) => apiFetch('/history/login?' + new URLSearchParams(params), {}, token),
    bans:            (params, token) => apiFetch('/history/bans?' + new URLSearchParams(params), {}, token),
    roleChanges:     (params, token) => apiFetch('/history/role-changes?' + new URLSearchParams(params), {}, token),
  },

  // ── NOTIFICATIONS
  notifications: {
    list:    (params, token)  => apiFetch('/notifications?' + new URLSearchParams(params), {}, token),
    read:    (id, token)      => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }, token),
    readAll: (token)          => apiFetch('/notifications/read-all', { method: 'PATCH' }, token),
    delete:  (id, token)      => apiFetch(`/notifications/${id}`, { method: 'DELETE' }, token),
    send:    (data, token)    => apiFetch('/notifications/send', { method: 'POST', body: JSON.stringify(data) }, token),
  },

  // ── ANNOUNCEMENTS
  announcements: {
    active: (token)           => apiFetch('/announcements', {}, token),
    all:    (params, token)   => apiFetch('/announcements/all?' + new URLSearchParams(params), {}, token),
    create: (data, token)     => apiFetch('/announcements', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete: (id, token)       => apiFetch(`/announcements/${id}`, { method: 'DELETE' }, token),
  },

  // ── FAQS
  faqs: {
    list:   (params)          => apiFetch('/faqs?' + new URLSearchParams(params)),
    admin:  (params, token)   => apiFetch('/faqs/admin?' + new URLSearchParams(params), {}, token),
    create: (data, token)     => apiFetch('/faqs', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/faqs/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
    delete: (id, token)       => apiFetch(`/faqs/${id}`, { method: 'DELETE' }, token),
  },

  // ── GALLERY
  gallery: {
    list:   (restaurantId)                  => apiFetch(`/gallery/${restaurantId}`),
    upload: (restaurantId, formData, token) => formFetch(`${BASE}/api/gallery/${restaurantId}`, token, formData),
    update: (id, data, token)               => apiFetch(`/gallery/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    delete: (id, token)                     => apiFetch(`/gallery/${id}`, { method: 'DELETE' }, token),
  },

  // ── STAFF EXTENDED (notes, tasks, warnings)
  staffExtended: {
    // Restaurant notes (staff writes notes about a restaurant)
    getNotes:      (restaurantId, token)      => apiFetch(`/staff-extended/notes/${restaurantId}`, {}, token),
    addNote:       (restaurantId, data, token)=> apiFetch(`/staff-extended/notes/${restaurantId}`, { method: 'POST', body: JSON.stringify(data) }, token),
    deleteNote:    (id, token)                => apiFetch(`/staff-extended/notes/${id}`, { method: 'DELETE' }, token),
    // Admin notes about a staff member
    getMemberNotes:   (staffId, token)        => apiFetch(`/staff-extended/member-notes/${staffId}`, {}, token),
    addMemberNote:    (staffId, data, token)  => apiFetch(`/staff-extended/member-notes/${staffId}`, { method: 'POST', body: JSON.stringify(data) }, token),
    deleteMemberNote: (id, token)             => apiFetch(`/staff-extended/member-notes/${id}`, { method: 'DELETE' }, token),
    getTasks:      (params, token)            => apiFetch('/staff-extended/tasks?' + new URLSearchParams(params), {}, token),
    createTask:    (data, token)              => apiFetch('/staff-extended/tasks', { method: 'POST', body: JSON.stringify(data) }, token),
    updateTask:    (id, data, token)          => apiFetch(`/staff-extended/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteTask:    (id, token)                => apiFetch(`/staff-extended/tasks/${id}`, { method: 'DELETE' }, token),
    getWarnings:   (staffId, token)           => apiFetch(`/staff-extended/warnings/${staffId}`, {}, token),
    issueWarning:  (data, token)              => apiFetch('/staff-extended/warnings', { method: 'POST', body: JSON.stringify(data) }, token),
    deleteWarning: (id, token)                => apiFetch(`/staff-extended/warnings/${id}`, { method: 'DELETE' }, token),
  },

  // ── SUPPORT TICKETS
  tickets: {
    list:   (params, token)   => apiFetch('/tickets?' + new URLSearchParams(params), {}, token),
    get:    (id, token)       => apiFetch(`/tickets/${id}`, {}, token),
    create: (data, token)     => apiFetch('/tickets', { method: 'POST', body: JSON.stringify(data) }, token),
    reply:  (id, data, token) => apiFetch(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id, data, token) => apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  },

  // ── ANALYTICS
  analytics: {
    overview: (token) => apiFetch('/analytics/overview', {}, token),
    revenue:  (token) => apiFetch('/analytics/revenue', {}, token),
  },

  // ── PAYMENTS
  payments: {
    list:   (params, token)   => apiFetch('/payments?' + new URLSearchParams(params), {}, token),
    create: (data, token)     => apiFetch('/payments', { method: 'POST', body: JSON.stringify(data) }, token),
    delete: (id, token)       => apiFetch(`/payments/${id}`, { method: 'DELETE' }, token),
  },
}
