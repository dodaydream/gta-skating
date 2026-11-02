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
const SNAP_POINTS = [0.5, 1];
const REPO_URL = "https://github.com/dodaydream/gta-skating";

function ScheduleFooter() {
  const { t } = useTranslation();
  return (
    <footer className="py-2.5 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
      <p>{t("sidebar.disclaimer")}</p>
      <div className="mt-1 flex items-center gap-2">
        <Link
          href="/privacy"
          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
        >
          {t("sidebar.privacy")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
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
  const [detent, setDetent] = useState<number>(SNAP_POINTS[0]);
  const isDesktop = useIsDesktop();

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
        snapPoints={SNAP_POINTS}
        onSnapPointChange={(next) => {
          if (typeof next === "number") setDetent(next);
        }}
        onOpenChange={(_nextOpen, eventDetails) => eventDetails.cancel()}
        showSwipeHandle
      >
        <DrawerContent
          className="border-black/[.08] dark:border-white/[.145] lg:hidden"
          header={
            <div className="flex items-start justify-between gap-2 px-6 pb-4 pt-6">
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
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
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
