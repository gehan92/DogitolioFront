'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap } from 'react-leaflet'
import { getCategoryConfig } from '@/lib/venueCategories'
import { buildVenueUrl } from '@/lib/venueUrl'
import { formatDistance } from '@/lib/distance'
import { StarRating, PriceBadge } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'

function pinDivIcon(color) {
  return L.divIcon({
    className: 'venue-pin',
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="15" cy="37" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
      <path fill="${color}" stroke="white" stroke-width="2"
        d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 23 14 23s14-12.5 14-23c0-7.7-6.3-14-14-14z"/>
      <circle cx="15" cy="15" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    popupAnchor: [0, -34],
  })
}

const USER_ICON = L.divIcon({
  className: 'user-pin',
  html: `<span class="user-pin-ring"><span class="user-pin-dot"></span></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

/** Frames the map to the user + every venue on mount/update instead of a fixed zoom guess. */
function FitBounds({ center, venues }) {
  const map = useMap()
  useEffect(() => {
    const points = [[center.lat, center.lng]]
    venues.forEach(v => {
      if (v.latitude != null && v.longitude != null) points.push([v.latitude, v.longitude])
    })
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
    }
  }, [map, center.lat, center.lng, venues])
  return null
}

function VenueMarkers({ venues, icons }) {
  return venues
    .filter(v => v.latitude != null && v.longitude != null)
    .map(v => {
      const cfg = getCategoryConfig(v.category)
      const rating = v.restaurant_ratings?.[0]?.avg_rating || 0
      const reviewCount = v.restaurant_ratings?.[0]?.review_count || 0
      return (
        <Marker key={v.id} position={[v.latitude, v.longitude]} icon={icons[v.category] || icons.restaurant}>
          <Popup className="venue-popup" minWidth={220} maxWidth={240}>
            {v.cover_image && (
              <div className="venue-popup-image" style={{ backgroundImage: `url(${v.cover_image})` }} />
            )}
            <div className="venue-popup-body">
              <div className="venue-popup-cat" style={{ color: cfg.accentColor }}>
                <span className="venue-popup-dot" style={{ background: cfg.accentColor }} />
                {cfg.singularLabel}
              </div>
              <strong className="venue-popup-name">{v.name}</strong>
              {(rating > 0 || v.price_range) && (
                <div className="venue-popup-meta">
                  {rating > 0 && (
                    <span className="venue-popup-rating">
                      <StarRating rating={rating} size={12} />
                      {rating.toFixed(1)}{reviewCount ? ` (${reviewCount})` : ''}
                    </span>
                  )}
                  {v.price_range && <PriceBadge range={v.price_range} />}
                </div>
              )}
              {typeof v.distance_km === 'number' && (
                <div className="venue-popup-distance">{formatDistance(v.distance_km)}</div>
              )}
              <a href={buildVenueUrl(v)} className="venue-popup-link">View details →</a>
            </div>
          </Popup>
        </Marker>
      )
    })
}

export default function RestaurantMap({ venues, center, radiusKm, className }) {
  const { activeTheme } = useTheme()
  const dark = !!activeTheme?.dark

  const icons = useMemo(() => ({
    restaurant: pinDivIcon(getCategoryConfig('restaurant').accentColor),
    hotel:      pinDivIcon(getCategoryConfig('hotel').accentColor),
    snack_bar:  pinDivIcon(getCategoryConfig('snack_bar').accentColor),
    food_shop:  pinDivIcon(getCategoryConfig('food_shop').accentColor),
  }), [])

  if (!center) return null

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <ZoomControl position="bottomright" />
        <FitBounds center={center} venues={venues} />
        {radiusKm && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: 'var(--c-brand)', weight: 1.5, fillColor: 'var(--c-brand)', fillOpacity: 0.06, dashArray: '4 6' }}
          />
        )}
        <Marker position={[center.lat, center.lng]} icon={USER_ICON} zIndexOffset={1000} />
        <VenueMarkers venues={venues} icons={icons} />
      </MapContainer>
    </div>
  )
}
