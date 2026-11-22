import { VenueDetailModal } from "@/components/schedule/VenueDetailModal";
import { venueSlugParams } from "@/data/schedules";

// Must match `venue/[slug]/page.tsx` exactly: a slot that declares different
// params silently drops every real venue page from the static export.
export function generateStaticParams() {
  return venueSlugParams();
}

export default async function ModalVenuePage({
  params,
}: PageProps<"/[lang]/venue/[slug]">) {
  const { slug } = await params;
  return <VenueDetailModal key={slug} slug={slug} />;
}
