"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Venue } from "@/types/venue";
import type { Program } from "@/types/schedule";
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
  formatTimeRange,
  getTodayInVenueTime,
  isProgramInProgress,
  isProgramNotEnded,
  osmUrl,
} from "@/lib/schedule";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekView } from "@/components/schedule/WeekView";
import { TicketBadge } from "@/components/schedule/TicketBadge";
import { BusyBadge } from "@/components/schedule/BusyBadge";
import { BusynessInput } from "@/components/schedule/BusynessInput";
import { trackEvent } from "@/lib/analytics";
import { X } from "lucide-react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const SNAP_POINTS = [0.5, 0.9];

const FIREBASE_CONFIGURED = isFirebaseConfigured();

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
  children,
}: {
  isDesktop: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
        className
      )}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export function VenueDetailModal({
  slug,
  onClose,
  userLocation,
}: {
  slug: string;
  onClose: () => void;
  userLocation?: { lat: number; lon: number } | null;
}) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"day" | "week">("day");
  const [reports, setReports] = useState<BusyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(FIREBASE_CONFIGURED);
  const [reportsSlug, setReportsSlug] = useState(slug);
  const [, setNowTick] = useState(0);
  const weekBodyRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const isDesktop = useIsDesktop();

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

  if (error) {
    return (
      <Panel
        isDesktop={isDesktop}
        onClose={onClose}
        header={
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <PanelTitle isDesktop={isDesktop} className="sr-only">
              Venue details
            </PanelTitle>
            <CloseButton onClick={onClose} />
          </div>
        }
      >
        <div className="px-5 pb-6">
          <p className="text-sm text-zinc-500">
            Failed to load venue details.
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

  const programs = venue.schedule.programs.filter((program) =>
    isProgramNotEnded(program.end, venue.timezone)
  );
  const updated = new Date(venue.schedule.updatedAt).toISOString().slice(0, 10);
  const inProgress = programs.some((program) =>
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

  return (
    <Panel
      isDesktop={isDesktop}
      onClose={onClose}
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
          <CloseButton onClick={onClose} />
        </header>
      }
    >
      <TodayCards
        programs={programs}
        timezone={venue.timezone}
        reports={reports}
        reportsLoading={reportsLoading}
      />

      {inProgress ? (
        <div className="px-5">
          <BusynessInput
            venueSlug={slug}
            timezone={venue.timezone}
            onSubmitted={reloadReports}
          />
        </div>
      ) : null}

      <div className="px-5">
        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        ref={weekBodyRef}
        className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-5"
      >
        {programs.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming sessions.</p>
        ) : view === "day" ? (
          <ListView
            programs={programs}
            timezone={venue.timezone}
            reports={reports}
            reportsLoading={reportsLoading}
            isDesktop={isDesktop}
          />
        ) : (
          <WeekView
            programs={programs}
            timezone={venue.timezone}
            bodyRef={weekBodyRef}
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-black/[.06] px-5 py-3 text-xs text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
        {venue.url ? (
          <a
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            href={venue.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Venue website
          </a>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-3">
          {venue.coordinates ? (
            <a
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              href={osmUrl(venue.coordinates.lat, venue.coordinates.lon)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on map
            </a>
          ) : null}
          <span className="text-zinc-400">Updated {updated}</span>
        </span>
      </footer>
    </Panel>
  );
}

function VenueDetailSkeletonHeader({
  isDesktop,
  onClose,
}: {
  isDesktop: boolean;
  onClose: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex flex-col gap-2">
        <PanelTitle isDesktop={isDesktop} className="sr-only">
          Loading venue details
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
  const today = getTodayInVenueTime(timezone);

  return (
    <div className="no-scrollbar w-full min-w-0 shrink-0 overflow-x-auto overflow-y-hidden px-5">
      <div className="flex gap-3 pb-1">
        {programs.map((program) => {
          const programDate = program.start.slice(0, 10);
          const isToday = programDate === today;
          return (
            <div
              key={`${program.id}-${program.start}`}
              className={`flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border p-3 ${
                isToday
                  ? "border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-center gap-2">
                <h3
                  className={`truncate text-xs font-semibold ${
                    isToday
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {formatEventDate(programDate, timezone)}
                </h3>
                {isToday ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Today
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
                <li className="flex flex-col gap-1 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatTimeRange(program.start, program.end)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-black dark:text-zinc-50">
                      {program.name}
                    </span>
                    <TicketBadge ticket={program.ticket} />
                  </div>
                  <BusyBadgeSlot
                    reports={reports}
                    reportsLoading={reportsLoading}
                    program={program}
                    timezone={timezone}
                  />
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
              {formatEventDate(date, timezone)}
            </h3>
            <span className="flex-1 border-t border-dashed border-black/[.08] dark:border-white/[.1]" />
            <span className="text-xs text-zinc-400">
              {datePrograms.length}
            </span>
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
