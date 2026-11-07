import SkatingApp from "@/components/SkatingApp";
import type { Metadata } from "next";
import { getSlugForVenue, getVenueBySlug, venues } from "@/data/schedules";
import { VenueSeoContent } from "@/components/seo/VenueSeoContent";
import { VenueStructuredData } from "@/components/seo/VenueStructuredData";
import { localizedAlternates } from "@/lib/site";

export function generateStaticParams() {
  return venues.map((venue) => ({ slug: getSlugForVenue(venue.name) }));
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

export default async function VenuePage({
  params,
}: PageProps<"/[lang]/venue/[slug]">) {
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
      <SkatingApp initialSlug={slug} />
    </>
  );
}
