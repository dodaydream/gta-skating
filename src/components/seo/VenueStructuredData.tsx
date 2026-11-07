import type { Venue } from "@/types/venue";
import { getUpcomingEvents } from "@/lib/schedule";
import { serializeJsonLd } from "@/lib/jsonld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const MAX_EVENTS = 50;

function parseAddress(address: string): {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
} {
  const [streetAddress = "", addressLocality = "", addressRegion = ""] = address
    .split(",")
    .map((part) => part.trim());
  return { streetAddress, addressLocality, addressRegion };
}

/** JSON-LD describing a venue and its upcoming sessions, for rich results. */
export function VenueStructuredData({
  venue,
  slug,
  locale,
}: {
  venue: Venue;
  slug: string;
  locale: string;
}) {
  const url = `${SITE_URL}/${locale}/venue/${slug}`;
  const { streetAddress, addressLocality, addressRegion } = parseAddress(
    venue.address
  );

  const location = {
    "@type": "SportsActivityLocation",
    "@id": `${url}#location`,
    name: venue.name,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality,
      addressRegion,
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.coordinates.lat,
      longitude: venue.coordinates.lon,
    },
    sport: "IceSkating",
    ...(venue.url ? { sameAs: venue.url } : {}),
  };

  const events = getUpcomingEvents(venue)
    .slice(0, MAX_EVENTS)
    .map((program) => ({
      "@type": "Event",
      name: program.name,
      startDate: program.start,
      endDate: program.end,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@id": `${url}#location` },
      offers: {
        "@type": "Offer",
        price: program.ticket,
        priceCurrency: "CAD",
        availability: "https://schema.org/InStock",
        url,
      },
    }));

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: `${SITE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: venue.name,
        item: url,
      },
    ],
  };

  const json = serializeJsonLd({
    "@context": "https://schema.org",
    "@graph": [location, breadcrumb, ...events],
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
