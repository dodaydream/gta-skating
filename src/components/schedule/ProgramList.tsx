"use client";

import type { Venue } from "@/types/venue";
import type { ProgramItem } from "@/types/schedule";
import { useTranslation } from "react-i18next";
import { ProgramListItem } from "@/components/schedule/ProgramListItem";
import { AdUnit } from "@/components/ads/AdUnit";
import { ScheduleSkeleton } from "@/components/ui/ScheduleSkeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconSnowflake } from "@tabler/icons-react";

type ProgramListProps = {
  loading: boolean;
  items: ProgramItem[];
  userLocation?: { lat: number; lon: number } | null;
  onSelectVenue: (venue: Venue) => void;
  className?: string;
  listClassName?: string;
};

export function ProgramList({
  loading,
  items,
  userLocation,
  onSelectVenue,
  className = "",
  listClassName = "flex flex-col gap-2 my-1",
}: ProgramListProps) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <div className={listClassName}>
        {loading ? (
          <ScheduleSkeleton />
        ) : items.length === 0 ? (
          <Empty className="my-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconSnowflake />
              </EmptyMedia>
              <EmptyTitle>{t("programs.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("programs.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          items.map((item) => (
            <ProgramListItem
              key={item.id}
              program={item}
              onSelect={() => onSelectVenue(item.venue)}
              userLocation={userLocation}
            />
          ))
        )}
      </div>

      <AdUnit className="mt-3" />
    </div>
  );
}
