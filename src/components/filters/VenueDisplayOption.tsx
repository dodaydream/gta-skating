"use client";

import { useTranslation } from "react-i18next";
import type { VenueDisplay } from "@/types/venue";
import { Button } from "@/components/ui/button";
import {
  IconEyeFilled,
  IconEyeOff,
  IconStarFilled,
} from "@tabler/icons-react";

interface VenueDisplayOptionProps {
  venueDisplay: VenueDisplay;
  onVenueDisplayChange: (venueDisplay: VenueDisplay) => void;
}

const VENUE_DISPLAY_OPTIONS: { value: VenueDisplay; labelKey: string }[] = [
  { value: "favorites", labelKey: "filters.favoritesOnly" },
  { value: "withPrograms", labelKey: "filters.withPrograms" },
  { value: "all", labelKey: "filters.allVenues" },
];

function VenueDisplayIcon({ value }: { value: VenueDisplay }) {
  if (value === "favorites") {
    return <IconStarFilled className="size-4 text-amber-500" />;
  }
  if (value === "withPrograms") {
    return <IconEyeOff className="size-4" />;
  }
  return <IconEyeFilled className="size-4 text-blue-500" />;
}

export function VenueDisplayOption({
  venueDisplay,
  onVenueDisplayChange,
}: VenueDisplayOptionProps) {
  const { t } = useTranslation();

  const venueDisplayIndex = VENUE_DISPLAY_OPTIONS.findIndex(
    (option) => option.value === venueDisplay
  );
  const currentVenueDisplay =
    VENUE_DISPLAY_OPTIONS[venueDisplayIndex] ?? VENUE_DISPLAY_OPTIONS[0];

  return (
    <Button
      variant="secondary"
      size="icon-lg"
      className="shadow-xs"
      data-slot="venue-display"
      aria-label={t(currentVenueDisplay.labelKey)}
      title={t(currentVenueDisplay.labelKey)}
      onClick={() => {
        const next =
          VENUE_DISPLAY_OPTIONS[
            (venueDisplayIndex + 1) % VENUE_DISPLAY_OPTIONS.length
          ];
        onVenueDisplayChange(next.value);
      }}
    >
      <VenueDisplayIcon value={currentVenueDisplay.value} />
    </Button>
  );
}
