import SkatingApp from "@/components/SkatingApp";
import { readdirSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";

export function generateStaticParams() {
  const dataDir = join(process.cwd(), "src", "data");
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  return files.map((f) => ({ slug: f.replace(/\.json$/, "") }));
}

export async function generateMetadata({
  params,
}: PageProps<"/arena/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await import(`@/data/${slug}.json`);
    const arena = data as { name: string; address: string };
    return {
      title: `${arena.name} — GTA Skating Schedule`,
      description: `Skating schedule, arena details, and map for ${arena.name} at ${arena.address}.`,
      alternates: { canonical: `/arena/${slug}` },
      openGraph: {
        title: `${arena.name} — GTA Skating Schedule`,
        description: `Skating schedule, arena details, and map for ${arena.name}.`,
        url: `https://gtaskating.com/arena/${slug}`,
      },
      twitter: {
        title: `${arena.name} — GTA Skating Schedule`,
        description: `Skating schedule, arena details, and map for ${arena.name}.`,
      },
    };
  } catch {
    return {
      title: "Arena — GTA Skating Schedule",
    };
  }
}

export default async function ArenaPage({ params }: PageProps<"/arena/[slug]">) {
  const { slug } = await params;
  return <SkatingApp initialSlug={slug} />;
}