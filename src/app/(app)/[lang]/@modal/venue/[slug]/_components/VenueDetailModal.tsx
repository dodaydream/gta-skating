"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { InfoItem, Rink, Venue } from "@/types/venue";
import type { Program } from "@/types/schedule";
import type { BusyAggregate } from "@/types/feedback";
import { fetchVenueDetails } from "@/api/venues";
import { getVenueBySlug } from "@/data/venue-meta";
import { loadVenueAggregate } from "@/api/busyness";
import { isFirebaseConfigured } from "@/lib/firebase";
import { predictBusy } from "@/lib/feedback";
import { cn } from "cn";
import { useIsDesktop } from "@/hooks/useIsDesktop";
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
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  distanceKm,
  formatDistance,
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
import { WeekView } from "./WeekView";
import { TicketBadge } from "./TicketBadge";
import { BusynessBadge } from "./BusynessBadge";
import { BusynessQuestionnaire } from "./BusynessQuestionnaire";
import { trackEvent } from "@/lib/analytics";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { amenityIcon } from "@/lib/amenities";
import { SITE_REPO } from "@/lib/site";
import { normalizeLocale } from "@/i18n/locales";
import { useLocale } from "@/i18n/LocaleProvider";
import { useSkatingAppData } from "@/app/(app)/[lang]/_components/SkatingAppDataProvider";
import {
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconShare2,
  IconSnowflake,
  IconStar,
  IconStarFilled,
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
      affectsDrawerHeight
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
        "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-muted hover:text-foreground",
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
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const url = `${window.location.origin}${BASE_PATH}/${locale}/venue/${slug}`;
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
        "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-muted hover:text-foreground",
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

function FavouriteButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const favorite = favorites.includes(slug);

  return (
    <button
      type="button"
      onClick={() => {
        toggleFavorite(slug);
        trackEvent(favorite ? "venue_unfavorite" : "venue_favorite", {
          venue: slug,
        });
      }}
      aria-pressed={favorite}
      aria-label={favorite ? t("venue.unfavorite") : t("venue.favorite")}
      title={favorite ? t("venue.unfavorite") : t("venue.favorite")}
      className={cn(
        "rounded-lg p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
        favorite
          ? "text-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
          : "text-zinc-500 hover:text-foreground",
        className
      )}
    >
      {favorite ? (
        <IconStarFilled className="h-5 w-5" />
      ) : (
        <IconStar className="h-5 w-5" />
      )}
    </button>
  );
}

function FilteredProgramsAlert({ onShowAll }: { onShowAll: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert variant="info">
      <IconInfoCircle />
      <AlertDescription>
        {t("venue.filteredAlertDescription")}{" "}
        <button
          type="button"
          onClick={onShowAll}
          className="font-medium underline underline-offset-3 hover:text-brand"
        >
          {t("venue.showAllPrograms")}
        </button>
      </AlertDescription>
    </Alert>
  );
}

export function VenueDetailModal({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const {
    userLocation,
    fromDate: filterFrom,
    toDate: filterTo,
    types: filterTypes,
    closeDetail: onClose,
  } = useSkatingAppData();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<"day" | "week">("day");
  const [aggregate, setAggregate] = useState<BusyAggregate | null>(null);
  const [aggregateLoading, setAggregateLoading] = useState(FIREBASE_CONFIGURED);
  const [, setNowTick] = useState(0);
  const [filterActive, setFilterActive] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const isDesktop = useIsDesktop();
  const venueId = getVenueBySlug(slug)?.id ?? slug;

  useEffect(() => {
    let cancelled = false;
    fetchVenueDetails(slug, { from: filterFrom, to: filterTo })
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
  }, [slug, filterFrom, filterTo]);

  const reloadAggregate = useCallback(() => {
    if (!FIREBASE_CONFIGURED) return;
    loadVenueAggregate(venueId)
      .then(setAggregate)
      .catch(() => {});
  }, [venueId]);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    let cancelled = false;
    loadVenueAggregate(venueId)
      .then((data) => {
        if (!cancelled) setAggregate(data);
      })
      .catch(() => {
        if (!cancelled) setAggregate(null);
      })
      .finally(() => {
        if (!cancelled) setAggregateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

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
    const meta = getVenueBySlug(slug);
    return (
      <Panel
        isDesktop={isDesktop}
        onClose={onClose}
        header={
          <VenueDetailSkeletonHeader
            isDesktop={isDesktop}
            onClose={onClose}
            name={meta?.name}
            address={meta?.address}
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

  return (
    <Panel
      isDesktop={isDesktop}
      onClose={onClose}
      bodyRef={bodyRef}
      header={
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <PanelTitle isDesktop={isDesktop} className="text-lg">
              {venue.name}
            </PanelTitle>
            <PanelDescription isDesktop={isDesktop}>
              {venue.address}
              {distance !== null ? (
                <span className="ml-2 text-muted-foreground">
                  · {formatDistance(distance)}
                </span>
              ) : null}
            </PanelDescription>
          </div>
          <div className="flex items-center gap-1">
            <FavouriteButton slug={slug} />
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
            aggregate={aggregate}
            aggregateLoading={aggregateLoading}
          />

          <RinksSection venueName={venue.name} rinks={venue.rinks} />
          <AmenitiesSection amenities={venue.amenities} />

          {currentProgram ? (
            <div className="px-5">
              <BusynessQuestionnaire
                venueId={venueId}
                venueSlug={slug}
                timezone={venue.timezone}
                program={currentProgram}
                onSubmitted={reloadAggregate}
              />
            </div>
          ) : null}

          <div className="flex flex-col">
            <div className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 bg-popover px-5">
              <h3 className="text-sm font-semibold text-foreground">
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
              {hasFilterCriteria && filterActive ? (
                <div className="pt-3">
                  <FilteredProgramsAlert onShowAll={() => setFilterActive(false)} />
                </div>
              ) : null}
              {view === "day" ? (
                <div className="pt-3">
                  <ListView
                    programs={programs}
                    timezone={venue.timezone}
                    aggregate={aggregate}
                    aggregateLoading={aggregateLoading}
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
          <AmenitiesSection amenities={venue.amenities} />
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <Empty className="my-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconSnowflake aria-hidden />
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

      <VenueInfoSection info={venue.info} />

      <footer className="flex flex-col gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <p className="text-center text-muted-foreground md:text-left">
          {t("venue.disclaimer")}
        </p>
        <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between md:gap-3">
          <span className="flex items-center gap-3">
            {venue.url ? (
              <a
                className="font-medium text-brand hover:underline"
                href={venue.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("programs.venueWebsite")}
              </a>
            ) : null}
            {venue.coordinates ? (
              <MapLink
                className="font-medium text-brand hover:underline"
                name={venue.name}
                coordinates={venue.coordinates}
                address={venue.address}
              />
            ) : null}
          </span>
          <span className="text-center text-muted-foreground md:text-right">
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
    `[Venue] ${venueName}`
  )}`;
  return (
    <section className="flex flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-popover px-5 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t("venue.rinks")}
        </h3>
        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          <IconAlertCircle className="h-3.5 w-3.5" />
          {t("venue.reportRink")}
        </a>
      </div>
      <ul className="flex flex-wrap gap-1.5 px-5 pb-1 pt-1">
        {rinks.map((rink) => (
          <li
            key={rink.name}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
          >
            <span className="font-medium text-foreground">
              {rink.name}
            </span>
            <span className="text-muted-foreground">{rink.type}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function websiteHost(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const INFO_LABELS: Record<string, string> = {
  operator: "venue.operator",
  year_built: "venue.yearBuilt",
  phone: "venue.phone",
  website: "venue.website",
};

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function VenueInfoSection({ info }: { info?: InfoItem[] }) {
  const { t } = useTranslation();
  if (!info || info.length === 0) return null;
  const renderValue = (item: InfoItem) => {
    if (/^https?:\/\//i.test(item.value)) {
      return (
        <a
          href={item.value}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {websiteHost(item.value)}
        </a>
      );
    }
    if (item.key === "phone") {
      return (
        <a
          href={`tel:${item.value.replace(/[^\d+]/g, "")}`}
          className="hover:underline"
        >
          {item.value}
        </a>
      );
    }
    return item.value;
  };
  return (
    <section className="px-5 pt-4">
      <h3 className="text-sm font-semibold text-foreground">
        {t("venue.info")}
      </h3>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {info.map((item) => (
          <Fragment key={item.key}>
            <dt className="text-muted-foreground">
              {INFO_LABELS[item.key]
                ? t(INFO_LABELS[item.key])
                : humanizeKey(item.key)}
            </dt>
            <dd className="break-words text-right text-zinc-900 dark:text-zinc-100">
              {renderValue(item)}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

function AmenitiesSection({ amenities }: { amenities?: string[] }) {
  const { t } = useTranslation();
  if (!amenities || amenities.length === 0) return null;
  return (
    <section className="flex flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-popover px-5 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t("venue.amenities")}
        </h3>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-2 pt-2 text-xs text-zinc-700 dark:text-zinc-300 sm:grid-cols-3">
        {amenities.map((amenity) => {
          const Icon = amenityIcon(amenity);
          return (
            <li key={amenity} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {t(`amenities.${amenity}`)}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VenueDetailSkeletonHeader({
  isDesktop,
  onClose,
  name,
  address,
}: {
  isDesktop: boolean;
  onClose: () => void;
  name?: string;
  address?: string;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex flex-col gap-2">
        {name ? (
          <>
            <PanelTitle isDesktop={isDesktop} className="text-lg">
              {name}
            </PanelTitle>
            {address ? (
              <PanelDescription isDesktop={isDesktop}>{address}</PanelDescription>
            ) : (
              <div className="h-4 w-64 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
            )}
          </>
        ) : (
          <>
            <PanelTitle isDesktop={isDesktop} className="sr-only">
              {t("venue.loading")}
            </PanelTitle>
            <div className="h-6 w-48 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
            <div className="h-4 w-64 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
          </>
        )}
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
              className="flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-border p-3"
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

function BusynessBadgeSlot({
  aggregate,
  aggregateLoading,
  program,
  className,
}: {
  aggregate: BusyAggregate | null;
  aggregateLoading: boolean;
  program: Program;
  className?: string;
}) {
  if (aggregateLoading) {
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
  const prediction = predictBusy(aggregate, program);
  if (!prediction) return null;
  return (
    <BusynessBadge
      busy={prediction.busy}
      n={prediction.n}
      className={className}
    />
  );
}

function TodayCards({
  programs,
  timezone,
  aggregate,
  aggregateLoading,
}: {
  programs: Program[];
  timezone: string;
  aggregate: BusyAggregate | null;
  aggregateLoading: boolean;
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
                  ? "border-brand/30 bg-brand/10 dark:border-brand/40 dark:bg-brand/15"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <h3
                  className={`min-w-0 truncate text-xs font-semibold ${
                    isCurrent
                      ? "text-brand"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {formatHumanDate(programDate, timezone, locale)}
                </h3>
                <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {formatTimeRange(program.start, program.end)}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-border">
                <li className="flex flex-col gap-1 py-1.5">
                  <span className="truncate text-sm text-foreground">
                    {program.name}
                  </span>
                  <div className="flex items-center gap-2 empty:hidden">
                    <TicketBadge ticket={program.ticket} />
                    <BusynessBadgeSlot
                      aggregate={aggregate}
                      aggregateLoading={aggregateLoading}
                      program={program}
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
  aggregate,
  aggregateLoading,
  isDesktop,
}: {
  programs: Program[];
  timezone: string;
  aggregate: BusyAggregate | null;
  aggregateLoading: boolean;
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
            <span className="flex-1 border-t border-dashed border-border" />
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {datePrograms.map((program) => (
              <li
                key={`${program.id}-${program.start}`}
                className="flex flex-col gap-1 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {formatTimeRange(program.start, program.end)}
                  </span>
                  <span className="text-foreground">
                    {program.name}
                  </span>
                  <TicketBadge ticket={program.ticket} />
                  {isDesktop ? (
                    <BusynessBadgeSlot
                      aggregate={aggregate}
                      aggregateLoading={aggregateLoading}
                      program={program}
                      className="ml-auto"
                    />
                  ) : null}
                </div>
                {program.notes ? (
                  <div className="w-full text-sm text-muted-foreground">
                    {program.notes}
                  </div>
                ) : null}
                {isDesktop ? null : (
                  <BusynessBadgeSlot
                    aggregate={aggregate}
                    aggregateLoading={aggregateLoading}
                    program={program}
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
