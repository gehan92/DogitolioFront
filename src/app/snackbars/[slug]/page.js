import { permanentRedirect, notFound } from 'next/navigation'
import RestaurantDetailClient from '@/components/restaurant/RestaurantDetailClient'
import { fetchVenueByParam, canonicalVenuePath, buildVenueMetadata, buildVenueJsonLd, safeJsonLd } from '@/lib/venuePageHelpers'

export async function generateMetadata({ params }) {
  const venue = await fetchVenueByParam(params.slug)
  if (!venue) return { title: 'Snack bar not found' }
  return buildVenueMetadata(venue, canonicalVenuePath(venue))
}

export default async function SnackBarPage({ params }) {
  const venue = await fetchVenueByParam(params.slug)
  if (!venue) notFound()

  const canonicalPath = canonicalVenuePath(venue)
  if (canonicalPath !== `/snackbars/${params.slug}`) {
    permanentRedirect(canonicalPath)
  }

  const jsonLd = buildVenueJsonLd(venue, canonicalPath)

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
