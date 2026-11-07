import type { Metadata } from "next";
import SkatingApp from "@/components/SkatingApp";
import { HomeSeoContent } from "@/components/seo/HomeSeoContent";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { localizedAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: localizedAlternates(lang, "") };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <>
      <HomeSeoContent locale={lang} />
      <SiteStructuredData locale={lang} />
      <SkatingApp />
    </>
  );
}
