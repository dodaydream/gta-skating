import SkatingApp from "@/components/SkatingApp";
import type { Metadata } from "next";
import { getSlugForVenue, getVenueBySlug, venues } from "@/data/schedules";

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
  const description = `Skating schedule, venue details, and map for ${venue.name} at ${venue.address}.`;
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
  return <SkatingApp initialSlug={slug} />;
}
