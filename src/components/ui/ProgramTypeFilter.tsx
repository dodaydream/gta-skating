"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ProgramType } from "@/types/schedule";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconCheck, IconFilter } from "@tabler/icons-react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const PROGRAM_TYPES = Object.values(ProgramType);

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

interface ProgramTypeFilterProps {
  types: ProgramType[];
  onChange: (types: ProgramType[]) => void;
  className?: string;
}

export function ProgramTypeFilter({
  types,
  onChange,
  className = "",
}: ProgramTypeFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const active = types.length > 0;

  const toggle = (type: ProgramType) => {
    onChange(
      types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type]
    );
  };

  const options = (
    <div className="flex flex-col gap-0.5 p-2.5">
      {PROGRAM_TYPES.map((type) => {
        const checked = types.includes(type);
        return (
          <Button
            key={type}
            variant="ghost"
            size="lg"
            className="justify-start font-normal"
            aria-pressed={checked}
            onClick={() => toggle(type)}
          >
            <span className="flex-1 text-left">
              {t(PROGRAM_TYPE_KEYS[type])}
            </span>
            {checked ? <IconCheck className="size-4 text-blue-500" /> : null}
          </Button>
        );
      })}
      {active ? (
        <Button
          variant="ghost"
          size="lg"
          className="justify-start font-normal text-muted-foreground"
          onClick={() => onChange([])}
        >
          {t("filters.clear")}
        </Button>
      ) : null}
    </div>
  );

  const trigger = (
    <>
      <IconFilter className={`size-4 ${active ? "text-blue-500" : ""}`} />
      <span>
        {active
          ? t("filters.typeCount", { count: types.length })
          : t("filters.type")}
      </span>
    </>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={active ? "default" : "secondary"}
              size="lg"
              className={`shadow-xs ${className}`}
            />
          }
        >
          {trigger}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0">
          {options}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Button
        variant={active ? "default" : "secondary"}
        size="lg"
        className={`shadow-xs ${className}`}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </Button>

      <Drawer open={open} onOpenChange={setOpen} swipeDirection="down" showSwipeHandle>
        <DrawerContent
          className="lg:hidden [--drawer-height:auto]"
          header={
            <DrawerTitle className="px-6 pb-2 pt-1 text-center text-base">
              {t("filters.programType")}
            </DrawerTitle>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
            {options}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
