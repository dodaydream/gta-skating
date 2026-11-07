import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SkatingApp from "@/components/SkatingApp";
import { AreaSeoContent } from "@/components/seo/AreaSeoContent";
import { AreaStructuredData } from "@/components/seo/AreaStructuredData";
import { areas, getAreaBySlug } from "@/data/areas";
import { getNearbyVenues } from "@/data/area-venues";
import { localizedAlternates, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return areas.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/areas/[area]">): Promise<Metadata> {
  const { lang, area: slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) {
    return {
      title: "Area — GTA Skating Schedule",
      alternates: localizedAlternates(lang, `/areas/${slug}`),
    };
  }
  const nearby = getNearbyVenues(area);
  const names = nearby.slice(0, 5).map((entry) => entry.venue.name);
  const description =
    names.length > 0
      ? `Drop-in skating near ${area.name}, including ${names.join(", ")}.`
      : `Drop-in skating schedules near ${area.name}.`;
  const title = `Skating near ${area.name} — GTA Skating Schedule`;
  return {
    title,
    description,
    alternates: localizedAlternates(lang, `/areas/${area.slug}`),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/areas/${area.slug}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function AreaPage({
  params,
}: PageProps<"/[lang]/areas/[area]">) {
  const { lang, area: slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();
  return (
    <>
      <AreaSeoContent area={area} locale={lang} />
      <AreaStructuredData area={area} locale={lang} />
      <SkatingApp area={area} />
    </>
  );
}
