"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppBar } from "./AppBar";
import { ScheduleSidebar } from "./ScheduleSidebar";
import {
  SkatingAppDataProvider,
  useSkatingAppData,
} from "./SkatingAppDataProvider";

const VenueMap = dynamic(() => import("./VenueMap"), {
  ssr: false,
});

function SkatingShellInner({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const {
    venues,
    visibleIndex,
    userLocation,
    focusVenue,
    favoriteFitPoints,
    locateRef,
    onSelect,
    onBoundsChange,
  } = useSkatingAppData();
  const { t } = useTranslation();

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 font-sans dark:bg-black">
      <a
        href="#main-results"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        {t("a11y.skipToResults")}
      </a>
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          role="region"
          aria-label={t("a11y.map")}
          className="relative flex-1 shrink-0 overflow-hidden lg:h-auto lg:flex-1"
        >
          <VenueMap
            venues={venues}
            selectedIndex={visibleIndex}
            onSelect={onSelect}
            onBoundsChange={onBoundsChange}
            userLocation={userLocation}
            locateRef={locateRef}
            focusVenue={focusVenue}
            fitTo={favoriteFitPoints}
          />

          <div className="pointer-events-none absolute left-0 right-0 top-3 z-40 pl-[calc(var(--spacing)*1.5)] pr-[calc(var(--spacing)*1.5)] lg:top-6 lg:pl-[calc(var(--safe-left)_+_1.5rem)] lg:pr-[calc(var(--safe-right)_+_1.5rem)]">
            <AppBar />
          </div>
        </div>

        <ScheduleSidebar />
      </div>

      {children}
      {modal}
    </div>
  );
}

/**
 * The persistent skating app shell: shared data provider, map, sidebar, and
 * filter bar. Rendered from `[lang]/layout.tsx` so it stays mounted across
 * navigation, with the route content (`children` = home, `modal` = venue detail)
 * rendered inside it so both can read the shared context.
 */
export function SkatingShell({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <SkatingAppDataProvider>
      <SkatingShellInner modal={modal}>{children}</SkatingShellInner>
    </SkatingAppDataProvider>
  );
}
