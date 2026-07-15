'use client'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { RefreshCw, LocateFixed } from 'lucide-react'
import { getCategoryConfig } from '@/lib/venueCategories'
import { buildVenueUrl } from '@/lib/venueUrl'
import { formatDistance, haversineKm } from '@/lib/distance'
import { StarRating, PriceBadge, Spinner } from '@/components/ui'
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

function clusterIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 34 : count < 50 ? 40 : 46
  return L.divIcon({
    html: `<div class="venue-cluster" style="width:${size}px;height:${size}px;">${count}</div>`,
    className: 'venue-cluster-wrap',
    iconSize: L.point(size, size),
  })
}

// How far (km) the map center must drift from the last searched point before
// offering to re-search — scales with radius so a 1km search isn't oversensitive.
function searchAgainThresholdKm(radiusKm) {
  return Math.max(radiusKm * 0.25, 0.3)
}

/** Floating overlay controls rendered inside the map: category filter chips,
 *  "search this area" (appears once the user pans/zooms away from center),
 *  and a recenter-on-me button. */
function MapControls({ center, radiusKm, onSearchArea, onRecenter, recentering, categoryTabs, activeCategory, onCategoryChange }) {
  const map = useMap()
  const [pending, setPending] = useState(null)

  useMapEvents({
    moveend() {
      const c = map.getCenter()
      const movedKm = haversineKm(center.lat, center.lng, c.lat, c.lng)
      setPending(movedKm > searchAgainThresholdKm(radiusKm) ? { lat: c.lat, lng: c.lng } : null)
    },
  })

  // Once the parent re-centers (search-this-area, recenter, or radius change), drop the prompt
  useEffect(() => { setPending(null) }, [center.lat, center.lng])

  return (
    <>
      {categoryTabs && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto scrollbar-hide">
          {categoryTabs.map(tab => {
            const Icon = tab.Icon
            const active = activeCategory === tab.slug
            return (
              <button
                key={tab.slug || 'all'}
                type="button"
                onClick={() => onCategoryChange(tab.slug)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-sm border border-transparent transition-colors"
                style={active
                  ? { background: 'linear-gradient(135deg,var(--c-brand),var(--c-brand-dk))', color: '#fff' }
                  : { background: 'color-mix(in srgb, var(--c-surface) 92%, transparent)', color: 'var(--c-muted)' }}
              >
                <Icon size={13} /> {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {pending && (
        <button
          type="button"
          onClick={() => { onSearchArea(pending); setPending(null) }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-fade-in text-white"
          style={{ background: 'linear-gradient(135deg,var(--c-brand),var(--c-brand-dk))' }}
        >
          <RefreshCw size={13} /> Search this area
        </button>
      )}

      <button
        type="button"
        onClick={onRecenter}
        disabled={recentering}
        aria-label="Recenter on my location"
        className="absolute bottom-5 left-3 z-[1000] w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors disabled:opacity-60"
        style={{ background: 'var(--c-surface)' }}
      >
        {recentering ? <Spinner size={16} /> : <LocateFixed size={17} style={{ color: 'var(--c-muted)' }} />}
      </button>
    </>
  )
}

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

export default function RestaurantMap({
  venues, center, radiusKm, className,
  onSearchArea, onRecenter, recentering,
  categoryTabs, activeCategory, onCategoryChange,
}) {
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
        <MarkerClusterGroup
          iconCreateFunction={clusterIcon}
          maxClusterRadius={50}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
        >
          <VenueMarkers venues={venues} icons={icons} />
        </MarkerClusterGroup>
        {onSearchArea && (
          <MapControls
            center={center}
            radiusKm={radiusKm}
            onSearchArea={onSearchArea}
            onRecenter={onRecenter}
            recentering={recentering}
            categoryTabs={categoryTabs}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
          />
        )}
      </MapContainer>
    </div>
  )
}
