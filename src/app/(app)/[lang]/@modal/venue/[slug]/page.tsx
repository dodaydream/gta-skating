import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getVenueBySlug, venueSlugParams } from "@/data/schedules";
import { VenueDetailModal } from "@/components/schedule/VenueDetailModal";
import { VenueSeoContent } from "@/components/seo/VenueSeoContent";
import { VenueStructuredData } from "@/components/seo/VenueStructuredData";
import { localizedAlternates } from "@/lib/site";

/**
 * The `@modal` slot owns the entire `/[lang]/venue/[slug]` route. Slots are not
 * route segments, so this page — not a `venue/[slug]` page in `children` —
 * defines the URL, its metadata, and its static params. `children` falls back to
 * `[lang]/default.tsx` (null) for this route.
 *
 * A parallel-route slot and a page at the same segment must declare identical
 * `generateStaticParams`; keeping the route in the slot alone means there is a
 * single source of params and no way for the two to silently diverge.
 */
export function generateStaticParams() {
  return venueSlugParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/venue/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) {
    return {
      title: "Venue — GTA Skating Schedule",
      alternates: localizedAlternates(lang, `/venue/${slug}`),
    };
  }
  const types = Array.from(
    new Set(venue.schedule.programs.map((program) => program.type))
  );
  const typeList =
    types.length > 0 ? types.join(", ").toLowerCase() : "drop-in skating";
  const description = `${typeList} schedules, prices, and an interactive map for ${venue.name} at ${venue.address}.`;
  return {
    title: `${venue.name} — GTA Skating Schedule`,
    description,
    alternates: localizedAlternates(lang, `/venue/${slug}`),
    openGraph: {
      title: `${venue.name} — GTA Skating Schedule`,
      description,
      url: `https://gtaskating.com/${lang}/venue/${slug}`,
    },
    twitter: {
      title: `${venue.name} — GTA Skating Schedule`,
      description,
    },
  };
}

export default async function ModalVenuePage({
  params,
}: PageProps<"/[lang]/venue/[slug]">): Promise<ReactNode> {
  const { lang, slug } = await params;
  const venue = getVenueBySlug(slug);
  return (
    <>
      {venue ? (
        <>
          <VenueSeoContent venue={venue} locale={lang} />
          <VenueStructuredData venue={venue} slug={slug} locale={lang} />
        </>
      ) : null}
      <VenueDetailModal key={slug} slug={slug} />
    </>
  );
}
