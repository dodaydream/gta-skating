"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ProgramType } from "@/types/schedule";
import type { RinkEnvironment } from "@/types/venue";
import { AMENITIES } from "@/lib/amenities";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconFilterFilled,
} from "@tabler/icons-react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const PROGRAM_TYPES = Object.values(ProgramType);

/** Indoor vs outdoor, in display order. */
const RINK_TYPES: RinkEnvironment[] = ["indoor", "outdoor"];

const RINK_TYPE_KEYS: Record<RinkEnvironment, string> = {
  indoor: "filters.indoor",
  outdoor: "filters.outdoor",
};

const PROGRAM_TYPE_KEYS: Record<ProgramType, string> = {
  [ProgramType.PublicSkate]: "programTypes.publicSkate",
  [ProgramType.PickupHockey]: "programTypes.pickupHockey",
  [ProgramType.FigureSkating]: "programTypes.figureSkating",
  [ProgramType.StickAndPuck]: "programTypes.stickAndPuck",
  [ProgramType.Ringette]: "programTypes.ringette",
  [ProgramType.IceBreakdancing]: "programTypes.iceBreakdancing",
};

const CHIP_CLASS =
  "rounded-full border-input gap-1.5 aria-pressed:border-blue-600 aria-pressed:bg-blue-600 aria-pressed:text-white aria-pressed:hover:bg-blue-600";
const CHIP_CHECK_CLASS = "hidden size-3.5 group-data-[pressed]/toggle:block";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => true);
}

interface FiltersControlProps {
  types: ProgramType[];
  onTypesChange: (types: ProgramType[]) => void;
  rinkTypes: RinkEnvironment[];
  onRinkTypesChange: (rinkTypes: RinkEnvironment[]) => void;
  amenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  sortBy: "time" | "distance";
  onSortChange: (sortBy: "time" | "distance") => void;
  hasLocation: boolean;
  className?: string;
}

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex flex-col gap-2"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 py-1 text-sm font-semibold text-foreground">
        <span>{title}</span>
        <IconChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function FiltersControl({
  types,
  onTypesChange,
  rinkTypes,
  onRinkTypesChange,
  amenities,
  onAmenitiesChange,
  sortBy,
  onSortChange,
  hasLocation,
  className = "",
}: FiltersControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const count = types.length + rinkTypes.length + amenities.length;
  const active = count > 0;

  const clearAll = () => {
    onTypesChange([]);
    onRinkTypesChange([]);
    onAmenitiesChange([]);
  };

  const toggleAmenity = (amenity: string) => {
    onAmenitiesChange(
      amenities.includes(amenity)
        ? amenities.filter((a) => a !== amenity)
        : [...amenities, amenity]
    );
  };

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 pt-2">
      <FilterSection title={t("filters.sortBy")}>
        <ToggleGroup
          aria-label={t("filters.sortBy")}
          spacing={0}
          value={[sortBy]}
          onValueChange={(value) =>
            onSortChange(value[0] === "distance" ? "distance" : "time")
          }
          className="w-full"
        >
          <ToggleGroupItem value="time" variant="outline" className="flex-1">
            {t("filters.sortSoonest")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="distance"
            variant="outline"
            className="flex-1"
            disabled={!hasLocation}
          >
            {t("filters.sortNearest")}
          </ToggleGroupItem>
        </ToggleGroup>
      </FilterSection>

      <FilterSection
        title={t("filters.rinkType")}
        defaultOpen={rinkTypes.length > 0}
      >
        <ToggleGroup
          multiple
          aria-label={t("filters.rinkType")}
          value={rinkTypes}
          onValueChange={(value) =>
            onRinkTypesChange(value as RinkEnvironment[])
          }
          className="flex w-full flex-wrap"
        >
          {RINK_TYPES.map((rinkType) => (
            <ToggleGroupItem
              key={rinkType}
              value={rinkType}
              variant="outline"
              className={CHIP_CLASS}
            >
              <IconCheck className={CHIP_CHECK_CLASS} />
              {t(RINK_TYPE_KEYS[rinkType])}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FilterSection>

      <FilterSection title={t("filters.programType")}>
        <ToggleGroup
          multiple
          aria-label={t("filters.programType")}
          value={types}
          onValueChange={(value) => onTypesChange(value as ProgramType[])}
          className="flex w-full flex-wrap"
        >
          {PROGRAM_TYPES.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              variant="outline"
              className={CHIP_CLASS}
            >
              <IconCheck className={CHIP_CHECK_CLASS} />
              {t(PROGRAM_TYPE_KEYS[type])}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FilterSection>

      <FilterSection
        title={t("filters.amenities")}
        defaultOpen={amenities.length > 0}
      >
        <div className="flex flex-col gap-0.5">
          {AMENITIES.map((amenity) => {
            const checked = amenities.includes(amenity);
            return (
              <Toggle
                key={amenity}
                pressed={checked}
                onPressedChange={() => toggleAmenity(amenity)}
                className="-mx-2 w-[calc(100%+1rem)] justify-start px-2 font-normal"
              >
                <span className="flex-1 text-left">
                  {t(`amenities.${amenity}`)}
                </span>
                {checked ? (
                  <IconCheck className="size-4 text-blue-500" />
                ) : null}
              </Toggle>
            );
          })}
        </div>
      </FilterSection>
    </div>
  );

  const footer = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={clearAll}
        disabled={!active}
      >
        {t("filters.clear")}
      </Button>
      <Button
        variant="default"
        size="default"
        className="flex-1 sm:flex-none"
        onClick={() => setOpen(false)}
      >
        {t("filters.done")}
      </Button>
    </div>
  );

  const trigger = active ? (
    <span className="relative">
      <IconFilterFilled className="size-4 text-blue-500" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-medium text-white">
          {count}
        </span>
      ) : null}
    </span>
  ) : (
    <IconFilter className="size-4" />
  );

  if (isDesktop) {
    return (
      <>
        <Button
          variant="secondary"
          size="icon-lg"
          className={`shadow-xs ${className}`}
          aria-label={t("filters.title")}
          title={t("filters.title")}
          onClick={() => setOpen(true)}
        >
          {trigger}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-md grid-rows-[auto_minmax(0,1fr)_auto] p-0">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle>{t("filters.title")}</DialogTitle>
            </DialogHeader>
            {body}
            {footer}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        size="icon-lg"
        className={`shadow-xs ${className}`}
        aria-label={t("filters.title")}
        title={t("filters.title")}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </Button>

      <Drawer open={open} onOpenChange={setOpen} swipeDirection="down" showSwipeHandle>
        <DrawerContent
          className="lg:hidden [--drawer-height:80vh]"
          header={
            <div className="px-4 pb-2 pt-1">
              <DrawerTitle className="text-base">
                {t("filters.title")}
              </DrawerTitle>
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {body}
            {footer}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
