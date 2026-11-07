import type { ComponentType } from "react";
import {
  IconAccessible,
  IconArmchair,
  IconBadgeWc,
  IconBroadcast,
  IconDoorEnter,
  IconHelmet,
  IconIceSkating,
  IconLock,
  IconParking,
  IconPointFilled,
  IconShoppingCart,
  IconToolsKitchen2,
  IconWifi,
} from "@tabler/icons-react";
import { AMENITIES, type Amenity } from "@/lib/amenity-keys";

export { AMENITIES, type Amenity };

type AmenityIcon = ComponentType<{ className?: string }>;

const AMENITY_ICONS: Record<Amenity, AmenityIcon> = {
  skate_rentals: IconIceSkating,
  helmet_rentals: IconHelmet,
  skate_sharpening: IconIceSkating,
  proshop: IconShoppingCart,
  snack_bar: IconToolsKitchen2,
  wifi: IconWifi,
  dressing_rooms: IconDoorEnter,
  lockers: IconLock,
  onsite_free_parking: IconParking,
  onsite_paid_parking: IconParking,
  washrooms: IconBadgeWc,
  gender_neutral_washrooms: IconBadgeWc,
  wheelchair_accessible: IconAccessible,
  spectator_seating: IconArmchair,
  live_streaming: IconBroadcast,
};

/** Resolve an icon for any amenity key, falling back to a dot for unknown keys. */
export function amenityIcon(amenity: string): AmenityIcon {
  return AMENITY_ICONS[amenity as Amenity] ?? IconPointFilled;
}
