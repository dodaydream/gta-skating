/**
 * Standardized amenity keys, stored in data as snake_case and translated at
 * render time via the `amenities.*` i18n namespace.
 *
 * Kept free of React imports so the scrapers can validate data against the same
 * list (see scraper/validate-meta.ts). The icon mapping lives in amenities.ts.
 */
export const AMENITIES = [
  "skate_rentals",
  "helmet_rentals",
  "skate_sharpening",
  "proshop",
  "snack_bar",
  "wifi",
  "dressing_rooms",
  "lockers",
  "onsite_free_parking",
  "onsite_paid_parking",
  "washrooms",
  "gender_neutral_washrooms",
  "wheelchair_accessible",
  "spectator_seating",
  "live_streaming",
] as const;

export type Amenity = (typeof AMENITIES)[number];
