import SkatingApp from "@/components/SkatingApp";
import { HomeSeoContent } from "@/components/seo/HomeSeoContent";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";

export default function Home() {
  return (
    <>
      <HomeSeoContent />
      <SiteStructuredData />
      <SkatingApp />
    </>
  );
}
