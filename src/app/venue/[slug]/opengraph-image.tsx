import { ImageResponse } from "next/og";
import { getSlugForVenue, getVenueBySlug, venues } from "@/data/schedules";

export const alt = "GTA Skating Schedule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return venues.map((venue) => ({ slug: getSlugForVenue(venue.name) }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  const name = venue?.name ?? "GTA Skating";
  const address = venue?.address ?? "Skating schedules across the GTA";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#09090b",
          color: "#fafafa",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 36, color: "#a1a1aa" }}>GTA Skating</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            {name}
          </div>
          <div style={{ fontSize: 36, color: "#d4d4d8" }}>{address}</div>
        </div>
        <div style={{ fontSize: 32, color: "#a1a1aa" }}>gtaskating.com</div>
      </div>
    ),
    size
  );
}
