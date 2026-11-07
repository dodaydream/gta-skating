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

function ToggleRow({
  checked,
  label,
  onClick,
  disabled,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start font-normal"
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="flex-1 text-left">{label}</span>
      {checked ? <IconCheck className="size-4 text-blue-500" /> : null}
    </Button>
  );
}

function Section({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex flex-col gap-1"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <span>
          {title}
          {count ? ` (${count})` : ""}
        </span>
        <IconChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-0.5">
        {children}
      </CollapsibleContent>
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

  const toggleType = (type: ProgramType) => {
    onTypesChange(
      types.includes(type) ? types.filter((t) => t !== type) : [...types, type]
    );
  };

  const toggleRinkType = (rinkType: RinkEnvironment) => {
    onRinkTypesChange(
      rinkTypes.includes(rinkType)
        ? rinkTypes.filter((r) => r !== rinkType)
        : [...rinkTypes, rinkType]
    );
  };

  const toggleAmenity = (amenity: string) => {
    onAmenitiesChange(
      amenities.includes(amenity)
        ? amenities.filter((a) => a !== amenity)
        : [...amenities, amenity]
    );
  };

  const clearAll = () => {
    onTypesChange([]);
    onRinkTypesChange([]);
    onAmenitiesChange([]);
  };

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-2">
      <Section title={t("filters.sortBy")}>
        <ToggleRow
          checked={sortBy === "time"}
          label={t("filters.sortSoonest")}
          onClick={() => onSortChange("time")}
        />
        <ToggleRow
          checked={sortBy === "distance"}
          label={t("filters.sortNearest")}
          disabled={!hasLocation}
          onClick={() => onSortChange("distance")}
        />
      </Section>

      <Section title={t("filters.programType")} count={types.length}>
        {PROGRAM_TYPES.map((type) => (
          <ToggleRow
            key={type}
            checked={types.includes(type)}
            label={t(PROGRAM_TYPE_KEYS[type])}
            onClick={() => toggleType(type)}
          />
        ))}
      </Section>

      <Section title={t("filters.rinkType")} count={rinkTypes.length}>
        {RINK_TYPES.map((rinkType) => (
          <ToggleRow
            key={rinkType}
            checked={rinkTypes.includes(rinkType)}
            label={t(RINK_TYPE_KEYS[rinkType])}
            onClick={() => toggleRinkType(rinkType)}
          />
        ))}
      </Section>

      <Section title={t("filters.amenities")} count={amenities.length}>
        {AMENITIES.map((amenity) => (
          <ToggleRow
            key={amenity}
            checked={amenities.includes(amenity)}
            label={t(`amenities.${amenity}`)}
            onClick={() => toggleAmenity(amenity)}
          />
        ))}
      </Section>
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
            <div className="px-6 pb-2 pt-1">
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
