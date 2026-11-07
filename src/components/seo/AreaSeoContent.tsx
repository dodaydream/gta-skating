import Link from "next/link";
import type { Area } from "@/data/areas";
import { areas } from "@/data/areas";
import { getNearbyVenues } from "@/data/area-venues";

/**
 * Server-rendered, crawlable content for an area landing page. Visually hidden
 * with `sr-only` because the interactive map fills the viewport, but present in
 * the HTML for search engines and assistive technology.
 */
export function AreaSeoContent({
  area,
  locale,
}: {
  area: Area;
  locale: string;
}) {
  const nearby = getNearbyVenues(area);
  const others = areas.filter((other) => other.slug !== area.slug);

  return (
    <section className="sr-only">
      <h1>Skating near {area.name}</h1>
      <p>
        Drop-in skating programs at {nearby.length} rink
        {nearby.length === 1 ? "" : "s"} within {area.radiusKm} km of{" "}
        {area.name}. Browse times, prices, and an interactive map.
      </p>
      <h2>Rinks near {area.name}</h2>
      <ul>
        {nearby.map(({ venue, slug, distanceKm }) => (
          <li key={venue.name}>
            <Link href={`/${locale}/venue/${slug}`}>
              {venue.name} — {venue.address} ({distanceKm.toFixed(1)} km)
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href={`/${locale}`}>See all GTA skating venues on the map</Link>
      </p>
      {others.length > 0 ? (
        <>
          <h2>Other areas</h2>
          <ul>
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={`/${locale}/areas/${other.slug}`}>
                  Skating near {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
