import { permanentRedirect, notFound } from 'next/navigation'
import RestaurantDetailClient from '@/components/restaurant/RestaurantDetailClient'
import { isUuid } from '@/lib/venueUrl'
import { fetchVenueByParam, canonicalVenuePath, buildVenueMetadata, buildVenueJsonLd, safeJsonLd } from '@/lib/venuePageHelpers'

export async function generateMetadata({ params }) {
  const restaurant = await fetchVenueByParam(params.id)
  if (!restaurant) return { title: 'Restaurant not found' }
  return buildVenueMetadata(restaurant, canonicalVenuePath(restaurant))
}

export default async function RestaurantPage({ params }) {
  const restaurant = await fetchVenueByParam(params.id)
  if (!restaurant) notFound()

  const canonicalPath = canonicalVenuePath(restaurant)

  // Legacy raw-UUID link, or this venue's category moved away from
  // "restaurant" since the link was shared — forward to the current URL.
  if (isUuid(params.id) || canonicalPath !== `/restaurants/${params.id}`) {
    permanentRedirect(canonicalPath)
  }

  const jsonLd = buildVenueJsonLd(restaurant, canonicalPath)

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      <RestaurantDetailClient />
    </>
  )
}
