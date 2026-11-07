import type { MapBounds } from "@/types/map";
import type { Coordinates } from "@/types/schedule";

export interface Area {
  /** URL segment for `/[lang]/areas/<slug>`, e.g. "davenport". */
  slug: string;
  /** Display name, e.g. "Davenport". A proper noun, so it is not translated. */
  name: string;
  /** Hand-picked centre the area is framed around. */
  center: Coordinates;
  /** Radius (km) that the area's initial map bounds are derived from. */
  radiusKm: number;
}

/**
 * Curated areas for the programmatic `/[lang]/areas/[area]` landing pages: the
 * names Torontonians commonly classify the city by, plus the surrounding GTA
 * municipalities. Approximate is fine — these exist for SEO, not exact scoping.
 *
 * To add an area: append one entry, then verify it by measuring straight-line
 * distances from `center` against `src/data/generated/venue-meta.json`
 * (`distanceKm` in `@/lib/schedule`); `radiusKm` should frame the intended
 * venues. Rebuild to regenerate the page, sitemap entry, and links.
 */
export const areas: Area[] = [
  {
    slug: "davenport",
    name: "Davenport",
    center: { lat: 43.6745, lon: -79.4366 }, // Davenport Rd / Dufferin
    radiusKm: 2.5,
  },
  {
    slug: "downtown-toronto",
    name: "Downtown Toronto",
    center: { lat: 43.6525, lon: -79.3832 }, // Nathan Phillips Square
    radiusKm: 2.5,
  },
  {
    slug: "yonge-eglinton",
    name: "Yonge & Eglinton",
    center: { lat: 43.706, lon: -79.4045 }, // Yonge St / Eglinton Ave
    radiusKm: 2.0,
  },
  {
    slug: "willowdale",
    name: "Willowdale",
    center: { lat: 43.7673, lon: -79.4149 }, // Mel Lastman Square
    radiusKm: 3.0,
  },
  {
    slug: "east-york",
    name: "East York",
    center: { lat: 43.692, lon: -79.3355 }, // Cosburn Ave / Coxwell Ave
    radiusKm: 2.6,
  },
  {
    slug: "leslieville",
    name: "Leslieville",
    center: { lat: 43.663, lon: -79.34 }, // Queen St E / Logan Ave
    radiusKm: 2.0,
  },
  {
    slug: "the-beaches",
    name: "The Beaches",
    center: { lat: 43.672, lon: -79.3 }, // Queen St E / Woodbine Ave
    radiusKm: 1.8,
  },
  {
    slug: "high-park",
    name: "High Park",
    center: { lat: 43.6499, lon: -79.4653 }, // High Park (Bloor St W)
    radiusKm: 2.6,
  },
  {
    slug: "don-mills",
    name: "Don Mills",
    center: { lat: 43.755, lon: -79.36 }, // Don Mills Rd / York Mills Rd
    radiusKm: 3.2,
  },
  {
    slug: "scarborough-centre",
    name: "Scarborough Centre",
    center: { lat: 43.7728, lon: -79.2572 }, // Albert Campbell Square
    radiusKm: 3.5,
  },
  {
    slug: "agincourt",
    name: "Agincourt",
    center: { lat: 43.7884, lon: -79.2763 }, // Agincourt Recreation Centre
    radiusKm: 2.0,
  },
  {
    slug: "etobicoke",
    name: "Etobicoke",
    center: { lat: 43.6569, lon: -79.5863 }, // Centennial Park
    radiusKm: 3.5,
  },
  {
    slug: "mimico",
    name: "Mimico",
    center: { lat: 43.61, lon: -79.51 }, // Lake Shore Blvd W / Royal York Rd
    radiusKm: 3.2,
  },
  {
    slug: "rexdale",
    name: "Rexdale",
    center: { lat: 43.74, lon: -79.575 }, // Islington Ave / Rexdale Blvd
    radiusKm: 3.2,
  },
  {
    slug: "weston",
    name: "Weston",
    center: { lat: 43.6986, lon: -79.5181 }, // Weston Rd / Lawrence Ave W
    radiusKm: 2.7,
  },
  {
    slug: "vaughan",
    name: "Vaughan",
    center: { lat: 43.825, lon: -79.545 }, // Woodbridge / Maple
    radiusKm: 5.5,
  },
  {
    slug: "richmond-hill",
    name: "Richmond Hill",
    center: { lat: 43.88, lon: -79.44 },
    radiusKm: 5.0,
  },
  {
    slug: "markham",
    name: "Markham",
    center: { lat: 43.87, lon: -79.28 },
    radiusKm: 5.0,
  },
  {
    slug: "thornhill",
    name: "Thornhill",
    center: { lat: 43.81, lon: -79.43 }, // Thornhill (Vaughan / Markham)
    radiusKm: 3.5,
  },
  {
    slug: "mississauga",
    name: "Mississauga",
    center: { lat: 43.58, lon: -79.65 },
    radiusKm: 8.0,
  },
  {
    slug: "pickering",
    name: "Pickering",
    center: { lat: 43.84, lon: -79.085 },
    radiusKm: 4.0,
  },
  {
    slug: "whitby",
    name: "Whitby",
    center: { lat: 43.9, lon: -78.95 },
    radiusKm: 5.0,
  },
  {
    slug: "stouffville",
    name: "Stouffville",
    center: { lat: 43.97, lon: -79.26 },
    radiusKm: 2.5,
  },
];

const bySlug = new Map(areas.map((area) => [area.slug, area]));

export function getAreaBySlug(slug: string): Area | undefined {
  return bySlug.get(slug);
}

const KM_PER_DEGREE_LAT = 111.32;

/**
 * A bounding box `radiusKm` around the area centre, used as the area page's
 * initial map bounds (the same `bounds` filter the map uses when the user pans).
 */
export function getAreaBounds(
  area: Pick<Area, "center" | "radiusKm">
): MapBounds {
  const latDelta = area.radiusKm / KM_PER_DEGREE_LAT;
  const lonDelta =
    area.radiusKm /
    (KM_PER_DEGREE_LAT * Math.cos((area.center.lat * Math.PI) / 180));
  return {
    north: area.center.lat + latDelta,
    south: area.center.lat - latDelta,
    west: area.center.lon - lonDelta,
    east: area.center.lon + lonDelta,
  };
}
