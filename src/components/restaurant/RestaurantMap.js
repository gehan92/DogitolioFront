'use client'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { getCategoryConfig } from '@/lib/venueCategories'
import { buildVenueUrl } from '@/lib/venueUrl'
import { formatDistance } from '@/lib/distance'

function pinDivIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" stroke="white" stroke-width="1.5"
        d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  })
}

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px rgba(37,99,235,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function VenueMarkers({ venues, icons }) {
  return venues
    .filter(v => v.latitude != null && v.longitude != null)
    .map(v => (
      <Marker key={v.id} position={[v.latitude, v.longitude]} icon={icons[v.category] || icons.restaurant}>
        <Popup>
          <div style={{ minWidth: 160 }}>
            <strong>{v.name}</strong>
            {typeof v.distance_km === 'number' && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{formatDistance(v.distance_km)}</div>
            )}
            <div style={{ marginTop: 6 }}>
              <a href={buildVenueUrl(v)} style={{ fontSize: 13, fontWeight: 600, color: '#FF2D55' }}>
                View details →
              </a>
            </div>
          </div>
        </Popup>
      </Marker>
    ))
}

export default function RestaurantMap({ venues, center, radiusKm, className }) {
  const icons = useMemo(() => ({
    restaurant: pinDivIcon(getCategoryConfig('restaurant').accentColor),
    hotel:      pinDivIcon(getCategoryConfig('hotel').accentColor),
    snack_bar:  pinDivIcon(getCategoryConfig('snack_bar').accentColor),
    food_shop:  pinDivIcon(getCategoryConfig('food_shop').accentColor),
  }), [])

  if (!center) return null

  return (
    <div className={className}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {radiusKm && (
          <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#FF2D55', weight: 1, fillOpacity: 0.05 }} />
        )}
        <Marker position={[center.lat, center.lng]} icon={USER_ICON} />
        <VenueMarkers venues={venues} icons={icons} />
      </MapContainer>
    </div>
  )
}
