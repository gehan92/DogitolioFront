import { permanentRedirect, notFound } from 'next/navigation'
import RestaurantDetailClient from '@/components/restaurant/RestaurantDetailClient'
import { fetchVenueByParam, canonicalVenuePath, buildVenueMetadata, buildVenueJsonLd } from '@/lib/venuePageHelpers'

export async function generateMetadata({ params }) {
  const venue = await fetchVenueByParam(params.slug)
  if (!venue) return { title: 'Hotel not found' }
  return buildVenueMetadata(venue, canonicalVenuePath(venue))
}

export default async function HotelPage({ params }) {
  const venue = await fetchVenueByParam(params.slug)
  if (!venue) notFound()

  const canonicalPath = canonicalVenuePath(venue)
  if (canonicalPath !== `/hotels/${params.slug}`) {
    permanentRedirect(canonicalPath)
  }

  const jsonLd = buildVenueJsonLd(venue, canonicalPath)

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <RestaurantDetailClient />
    </>
  )
}
