import { serializeJsonLd } from "@/lib/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** JSON-LD describing the site itself. */
export function SiteStructuredData({ locale }: { locale: string }) {
  const json = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    description: SITE_DESCRIPTION,
    inLanguage: locale === "fr" ? "fr-CA" : "en-CA",
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
