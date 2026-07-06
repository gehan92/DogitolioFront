// All restaurants operate in Sri Lanka — compute "open now" against Asia/Colombo time
// regardless of the visitor's own timezone.

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowInColomboMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const hour   = Number(parts.find(p => p.type === 'hour').value)
  const minute = Number(parts.find(p => p.type === 'minute').value)
  return hour * 60 + minute
}

// Returns true (open), false (closed), or null (hours not set — unknown).
export function isRestaurantOpenNow(opening_time, closing_time, is_closed_override) {
  if (is_closed_override) return false
  if (!opening_time || !closing_time) return null

  const openMin  = timeToMinutes(opening_time.slice(0, 5))
  const closeMin = timeToMinutes(closing_time.slice(0, 5))
  const nowMin   = nowInColomboMinutes()

  if (openMin === closeMin) return true // identical open/close = 24 hours
  if (openMin < closeMin) return nowMin >= openMin && nowMin < closeMin
  return nowMin >= openMin || nowMin < closeMin // overnight range, e.g. 18:00–02:00
}

export function formatTime12h(t) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatHoursRange(opening_time, closing_time) {
  if (!opening_time || !closing_time) return ''
  return `${formatTime12h(opening_time)} – ${formatTime12h(closing_time)}`
}
