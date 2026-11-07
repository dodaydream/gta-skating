"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RinkEnvironment, Venue, VenueDisplay } from "@/types/venue";
import type { MapBounds } from "@/types/map";
import type { ProgramItem, ProgramType } from "@/types/schedule";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/DateFilter";
import { FilterBar } from "@/components/ui/FilterBar";
import { ScheduleSidebar } from "@/components/ui/ScheduleSidebar";
import { VenueDetailModal } from "@/components/schedule/VenueDetailModal";
import { fetchPrograms } from "@/api/programs";
import { trackEvent } from "@/lib/analytics";
import { useFavorites } from "@/lib/favorites";
import { getVenueBySlug, getSlugForVenue } from "@/data/schedules";

const VenueMap = dynamic(() => import("@/components/map/VenueMap"), {
  ssr: false,
});

function nowLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function todayRange(): [string, string] {
  const now = nowLocalISO();
  return [now, `${now.slice(0, 10)}T23:59`];
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function getSlugFromPath(): string | null {
  const prefix = `${BASE_PATH}/venue/`;
  const { pathname } = window.location;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length);
  return slug ? decodeURIComponent(slug) : null;
}

function pushUrl(path: string) {
  window.history.pushState(null, "", `${BASE_PATH}${path}`);
}

export default function SkatingApp({ initialSlug }: { initialSlug?: string }) {
  const { t } = useTranslation();
  const locateRef = useRef<(() => void) | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailSlug, setDetailSlug] = useState<string | null>(initialSlug ?? null);
  const [focusVenue, setFocusVenue] = useState<{
    lat: number;
    lon: number;
  } | null>(() => {
    if (!initialSlug) return null;
    const coords = getVenueBySlug(initialSlug)?.coordinates;
    return coords && isFinite(coords.lat) && isFinite(coords.lon)
      ? { lat: coords.lat, lon: coords.lon }
      : null;
  });
  const favorites = useFavorites();
  // Default to the favourites view when the user already has saved arenas;
  // once they pick a mode explicitly, that choice wins.
  const [venueDisplayOverride, setVenueDisplayOverride] =
    useState<VenueDisplay | null>(null);
  const venueDisplay: VenueDisplay =
    venueDisplayOverride ??
    (favorites.length > 0 ? "favorites" : "withPrograms");
  const favoritesOnly = venueDisplay === "favorites";
  const hideEmpty = venueDisplay === "withPrograms";
  const [types, setTypes] = useState<ProgramType[]>([]);
  const [rinkTypes, setRinkTypes] = useState<RinkEnvironment[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"time" | "distance">("time");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const hasSetDate = useRef(false);

  const focusSlug = useCallback((slug: string) => {
    const coords = getVenueBySlug(slug)?.coordinates;
    if (!coords || !isFinite(coords.lat) || !isFinite(coords.lon)) return;
    setFocusVenue({ lat: coords.lat, lon: coords.lon });
  }, []);

  // A venue opened via the URL becomes the map's focus point (initialSlug is
  // handled by the lazy focusVenue initializer above).
  useEffect(() => {
    const onPopState = () => {
      const slug = getSlugFromPath();
      if (slug) {
        const venue = getVenueBySlug(slug);
        if (venue) {
          setDetailSlug(slug);
          focusSlug(slug);
        }
      } else {
        setDetailSlug(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [focusSlug]);

  useEffect(() => {
    if (hasSetDate.current) return;
    hasSetDate.current = true;
    const [f, t] = todayRange();
    setFromDate(f);
    setToDate(t);
  }, []);

  useEffect(() => {
    const refreshFrom = () => {
      const now = nowLocalISO();
      const today = now.slice(0, 10);
      setFromDate((prev) => (prev.slice(0, 10) === today ? now : prev));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshFrom();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", refreshFrom);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", refreshFrom);
    };
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let cancelled = false;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setUserLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => {
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } catch {
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    let cancelled = false;
    void fetchPrograms({
      from: fromDate,
      to: toDate,
      hideEmpty,
      types,
      rinkTypes,
      amenities,
      bounds: mapBounds,
      favoritesOnly,
      favoriteSlugs: favorites,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setVenues(result.venues);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    fromDate,
    toDate,
    hideEmpty,
    types,
    rinkTypes,
    amenities,
    mapBounds,
    favoritesOnly,
    favorites,
  ]);

  const handleSelect = useCallback(
    (index: number) => {
      const next = selectedIndex === index ? null : index;
      setSelectedIndex(next);
      const venue = next === null ? null : venues[next];
      const slug = venue ? getSlugForVenue(venue.name) : null;
      if (slug) {
        pushUrl(`/venue/${slug}`);
        setDetailSlug(slug);
      } else {
        pushUrl("/");
        setDetailSlug(null);
      }
    },
    [venues, selectedIndex]
  );

  // Selected pin: the current selection, or (once the list loads) the venue
  // opened via the URL so its pin shows as selected.
  const visibleIndex = useMemo(() => {
    if (!detailSlug) return selectedIndex;
    const venue = getVenueBySlug(detailSlug);
    if (!venue) return selectedIndex;
    const index = venues.findIndex((v) => v.name === venue.name);
    return index >= 0 ? index : selectedIndex;
  }, [detailSlug, venues, selectedIndex]);

  // When the favourites-only filter is active the map scales to fit every
  // favourite venue, regardless of the current date/program filters.
  const favoriteFitPoints = useMemo<[number, number][] | null>(() => {
    if (!favoritesOnly) return null;
    const points: [number, number][] = [];
    for (const slug of favorites) {
      const coords = getVenueBySlug(slug)?.coordinates;
      if (coords && isFinite(coords.lat) && isFinite(coords.lon)) {
        points.push([coords.lon, coords.lat]);
      }
    }
    return points.length > 0 ? points : null;
  }, [favoritesOnly, favorites]);

  const handleOpenVenue = useCallback(
    (venue: Venue) => {
      const slug = getSlugForVenue(venue.name);
      if (!slug) return;
      pushUrl(`/venue/${slug}`);
      setDetailSlug(slug);
      const index = venues.findIndex((v) => v.name === venue.name);
      setSelectedIndex(index >= 0 ? index : null);
    },
    [venues]
  );

  const handleCloseDetail = useCallback(() => {
    pushUrl("/");
    setDetailSlug(null);
    setSelectedIndex(null);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <VenueMap
            locateRef={locateRef}
            venues={venues}
            selectedIndex={visibleIndex}
            onSelect={handleSelect}
            onBoundsChange={setMapBounds}
            userLocation={userLocation}
            focusVenue={focusVenue}
            fitTo={favoriteFitPoints}
          />

          <div className="absolute left-0 right-0 top-[calc(var(--safe-top)_+_0.75rem)] z-40 pl-[calc(var(--safe-left)_+_0.75rem)] pr-[calc(var(--safe-right)_+_0.75rem)] lg:top-[calc(var(--safe-top)_+_1.5rem)] lg:pl-[calc(var(--safe-left)_+_1.5rem)] lg:pr-[calc(var(--safe-right)_+_1.5rem)]">
            <FilterBar>
              <Button
                variant="secondary"
                size="icon-lg"
                className="shadow-xs"
                onClick={() => {
                  trackEvent("locate_me");
                  locateRef.current?.();
                }}
                title={t("filters.locate")}
              >
                <IconLocation className="size-4" />
              </Button>
              <FilterChips
                className="min-w-0 flex-1 md:flex-none"
                from={fromDate}
                to={toDate}
                onFromChange={(v) => {
                  setFromDate(v);
                  trackEvent("date_filter_change", { from: v, to: toDate });
                }}
                onToChange={(v) => {
                  setToDate(v);
                  trackEvent("date_filter_change", { from: fromDate, to: v });
                }}
                onClear={() => {
                  const [f, t] = todayRange();
                  setFromDate(f);
                  setToDate(t);
                  trackEvent("date_filter_change", {
                    from: f,
                    to: t,
                    source: "clear",
                  });
                }}
                venueDisplay={venueDisplay}
                onVenueDisplayChange={(next) => {
                  setVenueDisplayOverride(next);
                  trackEvent("venue_display_change", { mode: next });
                }}
                types={types}
                onTypesChange={(next) => {
                  setTypes(next);
                  trackEvent("type_filter_change", { types: next.join(",") });
                }}
                rinkTypes={rinkTypes}
                onRinkTypesChange={(next) => {
                  setRinkTypes(next);
                  trackEvent("rink_type_filter_change", {
                    rinkTypes: next.join(","),
                  });
                }}
                amenities={amenities}
                onAmenitiesChange={(next) => {
                  setAmenities(next);
                  trackEvent("amenity_filter_change", {
                    amenities: next.join(","),
                  });
                }}
                sortBy={sortBy}
                onSortChange={(next) => {
                  setSortBy(next);
                  trackEvent("sort_change", { sort: next });
                }}
                hasLocation={!!userLocation}
              />
            </FilterBar>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        <ScheduleSidebar
          loading={loading}
          items={items}
          userLocation={userLocation}
          onSelectVenue={handleOpenVenue}
          detailOpen={detailSlug !== null}
          sortBy={sortBy}
        />
      </div>

      {detailSlug ? (
        <VenueDetailModal
          key={detailSlug}
          slug={detailSlug}
          userLocation={userLocation}
          onClose={handleCloseDetail}
          filterFrom={fromDate}
          filterTo={toDate}
          filterTypes={types}
        />
      ) : null}
    </div>
  );
}