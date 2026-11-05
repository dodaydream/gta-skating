import { serializeJsonLd } from "@/lib/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** JSON-LD describing the site itself. */
export function SiteStructuredData() {
  const json = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en-CA",
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
