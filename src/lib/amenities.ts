import type { ComponentType } from "react";
import {
  IconArmchair,
  IconBadgeWc,
  IconBroadcast,
  IconDoorEnter,
  IconHelmet,
  IconIceSkating,
  IconLock,
  IconParking,
  IconPointFilled,
  IconRepeat,
  IconShoppingCart,
  IconToolsKitchen2,
  IconWifi,
} from "@tabler/icons-react";

/**
 * Standardized amenity keys, stored in data as snake_case and translated at
 * render time via the `amenities.*` i18n namespace.
 */
export const AMENITIES = [
  "skate_rentals",
  "helmet_rentals",
  "skate_sharpening",
  "equipment_gear_purchase",
  "equipment_gear_rental",
  "snack_bar",
  "wifi",
  "dressing_rooms",
  "lockers",
  "onsite_free_parking",
  "onsite_paid_parking",
  "gender_neutral_washrooms",
  "spectator_seating",
  "live_streaming",
] as const;

export type Amenity = (typeof AMENITIES)[number];

type AmenityIcon = ComponentType<{ className?: string }>;

const AMENITY_ICONS: Record<Amenity, AmenityIcon> = {
  skate_rentals: IconIceSkating,
  helmet_rentals: IconHelmet,
  skate_sharpening: IconIceSkating,
  equipment_gear_purchase: IconShoppingCart,
  equipment_gear_rental: IconRepeat,
  snack_bar: IconToolsKitchen2,
  wifi: IconWifi,
  dressing_rooms: IconDoorEnter,
  lockers: IconLock,
  onsite_free_parking: IconParking,
  onsite_paid_parking: IconParking,
  gender_neutral_washrooms: IconBadgeWc,
  spectator_seating: IconArmchair,
  live_streaming: IconBroadcast,
};

/** Resolve an icon for any amenity key, falling back to a dot for unknown keys. */
export function amenityIcon(amenity: string): AmenityIcon {
  return AMENITY_ICONS[amenity as Amenity] ?? IconPointFilled;
}
