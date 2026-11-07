import type { Area } from "@/data/areas";
import { getNearbyVenues } from "@/data/area-venues";
import { serializeJsonLd } from "@/lib/jsonld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** JSON-LD describing an area page and the rinks within it, for rich results. */
export function AreaStructuredData({
  area,
  locale,
}: {
  area: Area;
  locale: string;
}) {
  const url = `${SITE_URL}/${locale}/areas/${area.slug}`;
  const nearby = getNearbyVenues(area);

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
        name: `Skating near ${area.name}`,
        item: url,
      },
    ],
  };

  const itemList = {
    "@type": "ItemList",
    name: `Skating rinks near ${area.name}`,
    itemListElement: nearby.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.venue.name,
      url: `${SITE_URL}/${locale}/venue/${entry.slug}`,
    })),
  };

  const json = serializeJsonLd({
    "@context": "https://schema.org",
    "@graph": [breadcrumb, itemList],
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
