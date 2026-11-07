import Link from "next/link";
import { venues, getSlugForVenue } from "@/data/schedules";
import { areas } from "@/data/areas";
import { SITE_DESCRIPTION } from "@/lib/site";

/**
 * Server-rendered, crawlable home content: a heading, description, and links to
 * every venue. Visually hidden with `sr-only` because the map app fills the
 * viewport, but present in the HTML for search engines.
 */
export function HomeSeoContent({ locale }: { locale: string }) {
  return (
    <section className="sr-only">
      <h1>GTA Skating Schedules</h1>
      <p>{SITE_DESCRIPTION}</p>
      <h2>Skating venues across the Greater Toronto Area</h2>
      <ul>
        {venues.map((venue) => (
          <li key={venue.name}>
            <Link href={`/${locale}/venue/${getSlugForVenue(venue.name)}`}>
              {venue.name} — {venue.address}
            </Link>
          </li>
        ))}
      </ul>
      <h2>Skating near</h2>
      <ul>
        {areas.map((area) => (
          <li key={area.slug}>
            <Link href={`/${locale}/areas/${area.slug}`}>
              Skating near {area.name}
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/data-sources">Data sources</Link>
      </p>
      <p>
        <Link href="/faq">FAQ</Link>
      </p>
      <p>
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </section>
  );
}
