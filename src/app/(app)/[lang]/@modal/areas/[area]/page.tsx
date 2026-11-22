import { areaSlugParams } from "@/data/areas";

// Must match `areas/[area]/page.tsx` exactly.
export function generateStaticParams() {
  return areaSlugParams();
}

/**
 * The `@modal` slot's area route. Renders nothing so that returning to an area
 * page (e.g. closing a venue opened from an area) dismisses the detail view.
 */
export default function ModalArea() {
  return null;
}
