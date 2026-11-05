"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Rink, Venue } from "@/types/venue";
import type { Program, ProgramType } from "@/types/schedule";
import type { BusyReport } from "@/types/feedback";
import { fetchVenueDetails } from "@/api/venues";
import { loadVenueReports } from "@/api/busyness";
import { isFirebaseConfigured } from "@/lib/firebase";
import { predictBusy } from "@/lib/feedback";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  distanceKm,
  formatEventDate,
  formatHumanDate,
  formatTimeRange,
  formatUpdatedDate,
  isProgramInProgress,
  isProgramNotEnded,
  geoUrl,
} from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekView } from "@/components/schedule/WeekView";
import { TicketBadge } from "@/components/schedule/TicketBadge";
import { BusyBadge } from "@/components/schedule/BusyBadge";
import { BusynessInput } from "@/components/schedule/BusynessInput";
import { trackEvent } from "@/lib/analytics";
import { SITE_REPO } from "@/lib/site";
import { normalizeLocale } from "@/i18n/config";
import {
  IconAlertCircle,
  IconCheck,
  IconShare2,
  IconSnowflake,
  IconX,
} from "@tabler/icons-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const DESKTOP_QUERY = "(min-width: 1024px)";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SNAP_POINTS = [0.5, 0.9];

const FIREBASE_CONFIGURED = isFirebaseConfigured();

const GEO_SCHEME_SUPPORTED = /Android|BlackBerry|IEMobile|Opera Mini/i;

function useGeoSchemeSupported() {
  return useSyncExternalStore(
    () => () => {},
    () => GEO_SCHEME_SUPPORTED.test(navigator.userAgent),
    () => false
  );
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function MapLink({
  name,
  coordinates,
  address,
  className,
}: {
  name?: string;
  coordinates: { lat: number; lon: number };
  address?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { lat, lon } = coordinates;
  const label = [name, address].filter(Boolean).join(", ");
  const query = label
    ? encodeURIComponent(label).replace(/%20/g, "+")
    : `${lat},${lon}`;
  const geoSchemeSupported = useGeoSchemeSupported();
  const href = geoSchemeSupported
    ? geoUrl(lat, lon)
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <a
      className={className}
      href={href}
      target={geoSchemeSupported ? undefined : "_blank"}
      rel="noopener noreferrer"
    >
      {geoSchemeSupported
        ? t("programs.viewOnMap")
        : t("programs.viewOnGoogleMaps")}
    </a>
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

function Panel({
  isDesktop,
  onClose,
  header,
  bodyRef,
  disablePointerDismissal,
  children,
}: {
  isDesktop: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  bodyRef?: React.Ref<HTMLDivElement>;
  disablePointerDismissal?: boolean;
  children: React.ReactNode;
}) {
  const body = (
    <div
      ref={bodyRef}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain isolate md:gap-4 group-data-[at-max-height=false]/drawer-popup:overflow-hidden"
    >
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          showOverlayBackground={false}
          className="flex max-h-[85dvh] flex-col overflow-hidden p-0"
          style={{ maxWidth: "48rem" }}
        >
          {header}
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open
      modal={false}
      swipeDirection="down"
      showSwipeHandle
      snapToSequentialPoints
      snapPoints={SNAP_POINTS}
      disablePointerDismissal={disablePointerDismissal}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent
        className="pb-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))] data-expanded:shadow-[0_-4px_24px_rgba(0,0,0,0.12)] [&>[data-slot=drawer-content]]:rounded-none"
        header={header}
      >
        {body}
      </DrawerContent>
    </Drawer>
  );
}

function PanelTitle({
  isDesktop,
  className,
  children,
}: {
  isDesktop: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (isDesktop) {
    return <DialogTitle className={className}>{children}</DialogTitle>;
  }
  return <DrawerTitle className={className}>{children}</DrawerTitle>;
}

function PanelDescription({
  isDesktop,
  className,
  children,
}: {
  isDesktop: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (isDesktop) {
    return <DialogDescription className={className}>{children}</DialogDescription>;
  }
  return <DrawerDescription className={className}>{children}</DrawerDescription>;
}

function CloseButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("close")}
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
        className
      )}
    >
      <IconX className="h-5 w-5" />
    </button>
  );
}

function ShareButton({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const url = `${window.location.origin}${BASE_PATH}/venue/${slug}`;
    const shareData = {
      title: name,
      text: t("venue.shareText", { name }),
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        trackEvent("venue_share", { venue: slug });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      trackEvent("venue_share_copy", { venue: slug });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("venue.share"), url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? t("venue.shareCopied") : t("venue.share")}
      title={t("venue.share")}
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
        className
      )}
    >
      {copied ? (
        <IconCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
      ) : (
        <IconShare2 className="h-5 w-5" />
      )}
    </button>
  );
}

export function VenueDetailModal({
  slug,
  onClose,
  userLocation,
  filterFrom,
  filterTo,
  filterTypes,
}: {
  slug: string;
  onClose: () => void;
  userLocation?: { lat: number; lon: number } | null;
  filterFrom?: string;
  filterTo?: string;
  filterTypes?: ProgramType[];
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"day" | "week">("day");
  const [reports, setReports] = useState<BusyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(FIREBASE_CONFIGURED);
  const [reportsSlug, setReportsSlug] = useState(slug);
  const [, setNowTick] = useState(0);
  const [filterActive, setFilterActive] = useState(true);
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const isDesktop = useIsDesktop();
  const isClient = useIsClient();

  if (reportsSlug !== slug) {
    setReportsSlug(slug);
    setReports([]);
    setReportsLoading(FIREBASE_CONFIGURED);
  }

  useEffect(() => {
    let cancelled = false;
    fetchVenueDetails(slug)
      .then((data) => {
        if (cancelled) return;
        setVenue(data);
        openedRef.current = true;
        trackEvent("arena_detail_open", {
          arena_name: data.name,
          program_count: data.schedule.programs?.length ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (openedRef.current) {
        openedRef.current = false;
        trackEvent("arena_detail_close", { arena_name: slug });
      }
    };
  }, [slug]);

  const reloadReports = useCallback(() => {
    if (!FIREBASE_CONFIGURED) return;
    loadVenueReports(slug)
      .then(setReports)
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    let cancelled = false;
    loadVenueReports(slug)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const root = bodyRef.current;
    const target = scheduleRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScheduleVisible(entry.isIntersecting),
      { root }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [venue]);

  if (error) {
    return (
      <Panel
        isDesktop={isDesktop}
        onClose={onClose}
        header={
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <PanelTitle isDesktop={isDesktop} className="sr-only">
              {t("venue.details")}
            </PanelTitle>
            <CloseButton onClick={onClose} />
          </div>
        }
      >
        <div className="px-5 pb-6">
          <p className="text-sm text-zinc-500">
            {t("venue.loadFailed")}
          </p>
        </div>
      </Panel>
    );
  }

  if (!venue) {
    return (
      <Panel
        isDesktop={isDesktop}
        onClose={onClose}
        header={
          <VenueDetailSkeletonHeader
            isDesktop={isDesktop}
            onClose={onClose}
          />
        }
      >
        <VenueDetailSkeleton />
      </Panel>
    );
  }

  const hasFilterCriteria = !!(filterFrom && filterTo) || (filterTypes && filterTypes.length > 0);
  const typeFilterSet =
    filterTypes && filterTypes.length > 0 ? new Set(filterTypes) : null;
  const inRange = (start: string, end: string) =>
    (!filterFrom || end > filterFrom) && (!filterTo || start <= filterTo);
  const matchesFilters = (program: Program) =>
    (!typeFilterSet || typeFilterSet.has(program.type)) &&
    (!filterFrom || inRange(program.start, program.end));

  const programs = venue.schedule.programs.filter((program) => {
    if (!isProgramNotEnded(program.end, venue.timezone)) return false;
    if (hasFilterCriteria && filterActive) return matchesFilters(program);
    return true;
  });
  const updated = formatUpdatedDate(
    venue.schedule.updatedAt,
    venue.timezone,
    locale
  );
  const currentProgram = programs.find((program) =>
    isProgramInProgress(program, venue.timezone)
  );

  const distance =
    userLocation &&
    venue.coordinates &&
    isFinite(venue.coordinates.lat) &&
    isFinite(venue.coordinates.lon)
      ? distanceKm(
          userLocation.lat,
          userLocation.lon,
          venue.coordinates.lat,
          venue.coordinates.lon
        )
      : null;

  const showFloating = hasFilterCriteria && filterActive && scheduleVisible && isClient;

  return (
    <Panel
      isDesktop={isDesktop}
      onClose={onClose}
      bodyRef={bodyRef}
      disablePointerDismissal={showFloating}
      header={
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <PanelTitle isDesktop={isDesktop} className="text-lg">
              {venue.name}
            </PanelTitle>
            <PanelDescription isDesktop={isDesktop}>
              {venue.address}
              {distance !== null ? (
                <span className="ml-2 text-zinc-400">
                  · {distance < 10 ? distance.toFixed(1) : Math.round(distance)} km
                </span>
              ) : null}
            </PanelDescription>
          </div>
          <div className="flex items-center gap-1">
            <ShareButton slug={slug} name={venue.name} />
            <CloseButton onClick={onClose} />
          </div>
        </header>
      }
    >
      {programs.length > 0 ? (
        <>
          <TodayCards
            programs={programs}
            timezone={venue.timezone}
            reports={reports}
            reportsLoading={reportsLoading}
          />

          <RinksSection venueName={venue.name} rinks={venue.rinks} />

          {currentProgram ? (
            <div className="px-5">
              <BusynessInput
                venueSlug={slug}
                timezone={venue.timezone}
                program={currentProgram}
                onSubmitted={reloadReports}
              />
            </div>
          ) : null}

          {showFloating
            ? createPortal(
                <div className="pointer-events-none fixed left-1/2 bottom-[calc(var(--safe-bottom,0px)+1rem)] z-[1400] -translate-x-1/2">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="pointer-events-auto h-10 rounded-full px-5 text-sm shadow-lg"
                    onClick={() => setFilterActive(false)}
                  >
                    {t("venue.showAllPrograms")}
                  </Button>
                </div>,
                document.body
              )
            : null}

          <div ref={scheduleRef} className="flex flex-col">
            <div className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 bg-popover px-5">
              <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
                {t("venue.schedule")}
              </h3>
              <Tabs
                value={view}
                onValueChange={(v) => setView(v as "day" | "week")}
              >
                <TabsList>
                  <TabsTrigger value="day">{t("venue.day")}</TabsTrigger>
                  <TabsTrigger value="week">{t("venue.week")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-3 px-5 md:gap-5">
              {view === "day" ? (
                <div className="pt-3">
                  <ListView
                    programs={programs}
                    timezone={venue.timezone}
                    reports={reports}
                    reportsLoading={reportsLoading}
                    isDesktop={isDesktop}
                  />
                </div>
              ) : (
                <WeekView
                  programs={programs}
                  timezone={venue.timezone}
                  bodyRef={bodyRef}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col">
          <RinksSection venueName={venue.name} rinks={venue.rinks} />
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <Empty className="my-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconSnowflake />
                </EmptyMedia>
                <EmptyTitle>{t("venue.emptyProgramsTitle")}</EmptyTitle>
                <EmptyDescription>
                  {hasFilterCriteria && filterActive
                    ? t("venue.emptyProgramsFiltered")
                    : t("venue.emptyProgramsAll")}
                </EmptyDescription>
              </EmptyHeader>
              {hasFilterCriteria && filterActive ? (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterActive(false)}
                  >
                    {t("venue.showAllPrograms")}
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </div>
        </div>
      )}

      <footer className="flex flex-col gap-2 border-t border-black/[.06] px-5 py-3 text-xs text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
        <p className="text-center text-zinc-400 md:text-left">
          {t("venue.disclaimer")}
        </p>
        <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between md:gap-3">
          <span className="flex items-center gap-3">
            {venue.url ? (
              <a
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                href={venue.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("programs.venueWebsite")}
              </a>
            ) : null}
            {venue.coordinates ? (
              <MapLink
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                name={venue.name}
                coordinates={venue.coordinates}
                address={venue.address}
              />
            ) : null}
          </span>
          <span className="text-center text-zinc-400 md:text-right">
            {t("programs.updated", { date: updated })}
          </span>
        </div>
      </footer>
    </Panel>
  );
}

function RinksSection({
  venueName,
  rinks,
}: {
  venueName: string;
  rinks?: Rink[];
}) {
  const { t } = useTranslation();
  if (!rinks || rinks.length === 0) return null;
  const reportUrl = `${SITE_REPO}/issues/new?template=report-rink.md&title=${encodeURIComponent(
    `[Rink] ${venueName}`
  )}`;
  return (
    <section className="flex flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-popover px-5 py-2">
        <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
          {t("venue.rinks")}
        </h3>
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-500 hover:text-black hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <IconAlertCircle className="h-3.5 w-3.5" />
          {t("venue.reportRink")}
        </a>
      </div>
      <ul className="flex flex-wrap gap-1.5 px-5 pb-1 pt-1">
        {rinks.map((rink) => (
          <li
            key={rink.name}
            className="flex items-center gap-1.5 rounded-full border border-black/[.08] bg-white px-2.5 py-1 text-xs dark:border-white/[.145] dark:bg-zinc-950"
          >
            <span className="font-medium text-black dark:text-zinc-50">
              {rink.name}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">{rink.type}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VenueDetailSkeletonHeader({
  isDesktop,
  onClose,
}: {
  isDesktop: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex flex-col gap-2">
        <PanelTitle isDesktop={isDesktop} className="sr-only">
          {t("venue.loading")}
        </PanelTitle>
        <div className="h-6 w-48 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
        <div className="h-4 w-64 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
      </div>
      <CloseButton onClick={onClose} />
    </header>
  );
}

function VenueDetailSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="no-scrollbar w-full min-w-0 shrink-0 overflow-x-auto overflow-y-hidden px-5"
      >
        <div className="flex gap-3 pb-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-black/[.08] p-3 dark:border-white/[.145]"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
              <div className="h-3.5 w-full animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="px-5">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-black/[.08] dark:bg-white/[.1]" />
      </div>

      <div
        aria-hidden="true"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-5"
      >
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-4 w-36 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex flex-col gap-2 py-2">
                <div className="h-4 w-24 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
                <div className="h-4 w-56 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function BusyBadgeSlot({
  reports,
  reportsLoading,
  program,
  timezone,
  className,
}: {
  reports: BusyReport[];
  reportsLoading: boolean;
  program: Program;
  timezone: string;
  className?: string;
}) {
  if (reportsLoading) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-3 w-16 animate-pulse rounded-full bg-black/[.06] dark:bg-white/[.08]",
          className
        )}
      />
    );
  }
  const prediction = predictBusy(reports, program, timezone);
  if (!prediction) return null;
  return (
    <BusyBadge
      busy={prediction.busy}
      n={prediction.n}
      className={className}
    />
  );
}

function TodayCards({
  programs,
  timezone,
  reports,
  reportsLoading,
}: {
  programs: Program[];
  timezone: string;
  reports: BusyReport[];
  reportsLoading: boolean;
}) {
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);

  return (
    <div className="no-scrollbar w-full min-w-0 shrink-0 overflow-x-auto overflow-y-hidden px-5">
      <div className="flex gap-3 pb-1">
        {programs.map((program) => {
          const programDate = program.start.slice(0, 10);
          const isCurrent = isProgramInProgress(program, timezone);
          return (
            <div
              key={`${program.id}-${program.start}`}
              className={`flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border p-3 ${
                isCurrent
                  ? "border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <h3
                  className={`min-w-0 truncate text-xs font-semibold ${
                    isCurrent
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {formatHumanDate(programDate, timezone, locale)}
                </h3>
                <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatTimeRange(program.start, program.end)}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
                <li className="flex flex-col gap-1 py-1.5">
                  <span className="truncate text-sm text-black dark:text-zinc-50">
                    {program.name}
                  </span>
                  <div className="flex items-center gap-2 empty:hidden">
                    <TicketBadge ticket={program.ticket} />
                    <BusyBadgeSlot
                      reports={reports}
                      reportsLoading={reportsLoading}
                      program={program}
                      timezone={timezone}
                    />
                  </div>
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  programs,
  timezone,
  reports,
  reportsLoading,
  isDesktop,
}: {
  programs: Program[];
  timezone: string;
  reports: BusyReport[];
  reportsLoading: boolean;
  isDesktop: boolean;
}) {
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const byDate = new Map<string, Program[]>();
  for (const p of programs) {
    const date = p.start.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(p);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byDate.entries()].map(([date, datePrograms]) => (
        <div key={date} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formatEventDate(date, timezone, locale)}
            </h3>
            <span className="flex-1 border-t border-dashed border-black/[.08] dark:border-white/[.1]" />
          </div>
          <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
            {datePrograms.map((program) => (
              <li
                key={`${program.id}-${program.start}`}
                className="flex flex-col gap-1 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                    {formatTimeRange(program.start, program.end)}
                  </span>
                  <span className="text-black dark:text-zinc-50">
                    {program.name}
                  </span>
                  <TicketBadge ticket={program.ticket} />
                  {isDesktop ? (
                    <BusyBadgeSlot
                      reports={reports}
                      reportsLoading={reportsLoading}
                      program={program}
                      timezone={timezone}
                      className="ml-auto"
                    />
                  ) : null}
                </div>
                {program.notes ? (
                  <div className="w-full text-sm text-zinc-500 dark:text-zinc-400">
                    {program.notes}
                  </div>
                ) : null}
                {isDesktop ? null : (
                  <BusyBadgeSlot
                    reports={reports}
                    reportsLoading={reportsLoading}
                    program={program}
                    timezone={timezone}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
