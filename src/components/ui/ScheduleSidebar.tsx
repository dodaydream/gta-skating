"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Venue } from "@/types/venue";
import type { ProgramItem } from "@/types/schedule";
import { ProgramList } from "@/components/schedule/ProgramList";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

type ScheduleSidebarProps = {
  loading: boolean;
  items: ProgramItem[];
  hideEmpty: boolean;
  onHideEmptyChange: (value: boolean) => void;
  userLocation?: { lat: number; lon: number } | null;
  onSelectVenue: (venue: Venue) => void;
  detailOpen: boolean;
};

const DESKTOP_QUERY = "(min-width: 1024px)";
const MIN_SNAP = 0.5;

// The max snap point leaves the floating top bar + margin visible, i.e. the
// drawer can grow to `viewportHeight - (topbar + margin)` but no further.
function useSnapPoints(): number[] {
  const [snapPoints, setSnapPoints] = useState<number[]>([MIN_SNAP, 1]);

  useEffect(() => {
    const compute = () => {
      const root = document.documentElement;
      const rootFont = parseFloat(getComputedStyle(root).fontSize) || 16;
      const toPx = (name: string) => {
        const raw = getComputedStyle(root).getPropertyValue(name).trim();
        const match = /^(-?[\d.]+)(px|rem)?$/.exec(raw);
        if (!match) return 0;
        const value = parseFloat(match[1]);
        return match[2] === "px" ? value : value * rootFont;
      };
      const reserved = toPx("--topbar-height") + toPx("--topbar-margin");
      const max = Math.min(
        1,
        Math.max(MIN_SNAP, (window.innerHeight - reserved) / window.innerHeight)
      );
      setSnapPoints([MIN_SNAP, Number(max.toFixed(4))]);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return snapPoints;
}
const REPO_URL = "https://github.com/dodaydream/gta-skating";
const SUPPORT_URL = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;

function ScheduleFooter() {
  const { t } = useTranslation();
  return (
    <footer className="py-2.5 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
      <p className="mb-3">{t("sidebar.disclaimer")}</p>
      <p className="mb-1">© {new Date().getFullYear()} GTA Skating</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href="/privacy"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          {t("sidebar.privacy")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        <Link
          href="/data-sources"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          {t("sidebar.dataSources")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        {SUPPORT_URL ? (
          <>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap bg-clip-text transition-colors hover:bg-gradient-to-r hover:from-[#FFDD00] hover:to-[#FF813F] hover:text-transparent"
            >
              Buy Me a Coffee
            </a>
            <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
              ·
            </span>
          </>
        ) : null}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function ScheduleSidebar({
  loading,
  items,
  userLocation,
  onSelectVenue,
  detailOpen,
}: ScheduleSidebarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const isDesktop = useIsDesktop();
  const snapPoints = useSnapPoints();

  useEffect(() => {
    if (!isDesktop) setOpen(!detailOpen);
  }, [detailOpen, isDesktop]);

  const programCount = t("sidebar.programsFound", { count: items.length });

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden flex-col border-t border-black/[.08] bg-card dark:border-white/[.145] lg:static lg:flex lg:w-96 lg:shrink-0 lg:border-t-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
                {t("sidebar.title")}
              </h1>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {programCount}
              </span>
            </div>
            <LanguageToggle />
          </div>

          <ProgramList
            items={items}
            loading={loading}
            userLocation={userLocation}
            onSelectVenue={onSelectVenue}
            className="flex min-h-0 flex-1 flex-col"
            listClassName="flex flex-1 flex-col gap-2"
          />
        </div>
        <div className="shrink-0 bg-card px-6 pb-5">
          <ScheduleFooter />
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      <Drawer
        open={open}
        modal={false}
        disablePointerDismissal
        swipeDirection="down"
        snapToSequentialPoints
        snapPoints={snapPoints}
        onOpenChange={(_nextOpen, eventDetails) => eventDetails.cancel()}
        showSwipeHandle
      >
        <DrawerContent
          className="border-black/[.08] pb-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))] dark:border-white/[.145] lg:hidden"
          header={
            <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
              <div className="flex flex-col">
                <DrawerTitle className="text-xl font-semibold tracking-tight">
                  {t("sidebar.title")}
                </DrawerTitle>
                <DrawerDescription className="text-left text-sm">
                  {programCount}
                </DrawerDescription>
              </div>
              <LanguageToggle />
            </div>
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 group-data-[at-max-height=false]/drawer-popup:overflow-hidden">
            <ProgramList
              items={items}
              loading={loading}
              userLocation={userLocation}
              onSelectVenue={onSelectVenue}
            />
            <ScheduleFooter />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
