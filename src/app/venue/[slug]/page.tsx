import SkatingApp from "@/components/SkatingApp";
import type { Metadata } from "next";
import { getSlugForVenue, getVenueBySlug, venues } from "@/data/schedules";
import { VenueSeoContent } from "@/components/seo/VenueSeoContent";
import { VenueStructuredData } from "@/components/seo/VenueStructuredData";

export function generateStaticParams() {
  return venues.map((venue) => ({ slug: getSlugForVenue(venue.name) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/venue/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) {
    return { title: "Venue — GTA Skating Schedule" };
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
    alternates: { canonical: `/venue/${slug}` },
    openGraph: {
      title: `${venue.name} — GTA Skating Schedule`,
      description,
      url: `https://gtaskating.com/venue/${slug}`,
    },
    twitter: {
      title: `${venue.name} — GTA Skating Schedule`,
      description,
    },
  };
}

export default async function VenuePage({ params }: PageProps<"/venue/[slug]">) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  return (
    <>
      {venue ? (
        <>
          <VenueSeoContent venue={venue} />
          <VenueStructuredData venue={venue} slug={slug} />
        </>
      ) : null}
      <SkatingApp initialSlug={slug} />
    </>
  );
}
