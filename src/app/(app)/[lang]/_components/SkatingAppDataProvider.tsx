"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import type { RinkEnvironment, Venue, VenueDisplay } from "@/types/venue";
import type { MapBounds } from "@/types/map";
import type { Coordinates, ProgramItem, ProgramType } from "@/types/schedule";
import { fetchPrograms } from "@/api/programs";
import { trackEvent } from "@/lib/analytics";
import { useFavorites } from "@/lib/favorites";
import { getVenueBySlug, getSlugForVenue } from "@/data/venue-meta";
import { useLocale } from "@/i18n/LocaleProvider";

export type SortBy = "time" | "distance";

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

function useStringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export type SkatingAppData = {
  // Data
  items: ProgramItem[];
  venues: Venue[];
  loading: boolean;
  favorites: readonly string[];

  // Current location
  userLocation: Coordinates | null;

  // Current filters
  fromDate: string;
  toDate: string;
  types: ProgramType[];
  rinkTypes: RinkEnvironment[];
  amenities: string[];
  sortBy: SortBy;
  venueDisplay: VenueDisplay;
  favoritesOnly: boolean;
  hideEmpty: boolean;

  // Selection & map scope
  visibleIndex: number | null;
  detailSlug: string | null;
  focusVenue: Coordinates | null;
  mapBounds: MapBounds | null;
  favoriteFitPoints: [number, number][] | null;
  locateRef: MutableRefObject<(() => void) | null>;

  // Filter actions
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  resetDateRange: () => void;
  setTypes: (types: ProgramType[]) => void;
  setRinkTypes: (rinkTypes: RinkEnvironment[]) => void;
  setAmenities: (amenities: string[]) => void;
  setSortBy: (sortBy: SortBy) => void;
  setVenueDisplay: (venueDisplay: VenueDisplay) => void;

  // Actions
  onSelect: (index: number) => void;
  openVenue: (venue: Venue) => void;
  closeDetail: () => void;
  openUser: () => void;
  closeUser: () => void;
  onBoundsChange: (bounds: MapBounds) => void;
};

const SkatingAppDataContext = createContext<SkatingAppData | null>(null);

/** Shared skating-app state and actions. Must be used within a provider. */
export function useSkatingAppData(): SkatingAppData {
  const value = useContext(SkatingAppDataContext);
  if (!value) {
    throw new Error(
      "useSkatingAppData must be used within a SkatingAppDataProvider"
    );
  }
  return value;
}

/** The user's current coordinates, or null while unknown/denied. */
export function useUserLocation(): Coordinates | null {
  return useSkatingAppData().userLocation;
}

export function SkatingAppDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ slug?: string }>();
  const locateRef = useRef<(() => void) | null>(null);

  // The open venue is derived from the URL: the shell (and this provider) is
  // mounted from `[lang]/layout.tsx`, so this param updates as the user
  // navigates without remounting the map or the list.
  const detailSlug = useStringParam(params.slug) ?? null;

  // Set when a venue is opened from within the app (list/map). Distinguishes an
  // in-app open — which closes with `router.back()` — from a deep link, which
  // closes by pushing the unscoped home route.
  const openedInAppRef = useRef(false);

  // Same distinction for the user centre modal route.
  const openedUserRef = useRef(false);

  const [fromDate, setFromDateState] = useState("");
  const [toDate, setToDateState] = useState("");
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [types, setTypesState] = useState<ProgramType[]>([]);
  const [rinkTypes, setRinkTypesState] = useState<RinkEnvironment[]>([]);
  const [amenities, setAmenitiesState] = useState<string[]>([]);
  const [sortBy, setSortByState] = useState<SortBy>("time");

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const hasSetDate = useRef(false);

  // A venue opened via the URL (deep link or navigation) becomes the map's
  // focus point.
  const focusVenue = useMemo<Coordinates | null>(() => {
    if (!detailSlug) return null;
    const coords = getVenueBySlug(detailSlug)?.coordinates;
    return coords && isFinite(coords.lat) && isFinite(coords.lon)
      ? { lat: coords.lat, lon: coords.lon }
      : null;
  }, [detailSlug]);

  useEffect(() => {
    if (hasSetDate.current) return;
    hasSetDate.current = true;
    const [f, t] = todayRange();
    setFromDateState(f);
    setToDateState(t);
  }, []);

  useEffect(() => {
    const refreshFrom = () => {
      const now = nowLocalISO();
      const today = now.slice(0, 10);
      setFromDateState((prev) => (prev.slice(0, 10) === today ? now : prev));
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
        () => {},
        { timeout: 10000, enableHighAccuracy: false }
      );
    } catch {}
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

  const setFromDate = useCallback(
    (value: string) => {
      setFromDateState(value);
      trackEvent("date_filter_change", { from: value, to: toDate });
    },
    [toDate]
  );

  const setToDate = useCallback(
    (value: string) => {
      setToDateState(value);
      trackEvent("date_filter_change", { from: fromDate, to: value });
    },
    [fromDate]
  );

  const resetDateRange = useCallback(() => {
    const [f, t] = todayRange();
    setFromDateState(f);
    setToDateState(t);
    trackEvent("date_filter_change", { from: f, to: t, source: "clear" });
  }, []);

  const setTypes = useCallback((next: ProgramType[]) => {
    setTypesState(next);
    trackEvent("type_filter_change", { types: next.join(",") });
  }, []);

  const setRinkTypes = useCallback((next: RinkEnvironment[]) => {
    setRinkTypesState(next);
    trackEvent("rink_type_filter_change", { rinkTypes: next.join(",") });
  }, []);

  const setAmenities = useCallback((next: string[]) => {
    setAmenitiesState(next);
    trackEvent("amenity_filter_change", { amenities: next.join(",") });
  }, []);

  const setSortBy = useCallback((next: SortBy) => {
    setSortByState(next);
    trackEvent("sort_change", { sort: next });
  }, []);

  const setVenueDisplay = useCallback((next: VenueDisplay) => {
    setVenueDisplayOverride(next);
    trackEvent("venue_display_change", { mode: next });
  }, []);

  // Keep the map/list scope in sync with the viewport.
  const onBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const openVenue = useCallback(
    (venue: Venue) => {
      const slug = getSlugForVenue(venue.name);
      if (!slug) return;
      openedInAppRef.current = true;
      router.push(`/${locale}/venue/${slug}`);
    },
    [locale, router]
  );

  const closeDetail = useCallback(() => {
    // An in-app open has a previous history entry to return to; a deep link
    // does not, so fall back to the unscoped home map for the current locale.
    if (openedInAppRef.current) {
      router.back();
    } else {
      router.push(`/${locale}`);
    }
  }, [locale, router]);

  const openUser = useCallback(() => {
    openedUserRef.current = true;
    router.push(`/${locale}/user`);
  }, [locale, router]);

  const closeUser = useCallback(() => {
    // Mirror `closeDetail`: an in-app open returns via history, a deep link
    // falls back to the unscoped home map for the current locale.
    if (openedUserRef.current) {
      router.back();
    } else {
      router.push(`/${locale}`);
    }
  }, [locale, router]);

  const onSelect = useCallback(
    (index: number) => {
      const venue = venues[index];
      if (!venue) return;
      const slug = getSlugForVenue(venue.name);
      // Clicking the already-open venue's pin closes its detail.
      if (slug && slug === detailSlug) {
        closeDetail();
      } else {
        openVenue(venue);
      }
    },
    [venues, detailSlug, closeDetail, openVenue]
  );

  // The venue whose pin is selected: the one open in the detail view.
  const visibleIndex = useMemo(() => {
    if (!detailSlug) return null;
    const venue = getVenueBySlug(detailSlug);
    if (!venue) return null;
    const index = venues.findIndex((v) => v.name === venue.name);
    return index >= 0 ? index : null;
  }, [detailSlug, venues]);

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

  const value = useMemo<SkatingAppData>(
    () => ({
      items,
      venues,
      loading,
      favorites,
      userLocation,
      fromDate,
      toDate,
      types,
      rinkTypes,
      amenities,
      sortBy,
      venueDisplay,
      favoritesOnly,
      hideEmpty,
      visibleIndex,
      detailSlug,
      focusVenue,
      mapBounds,
      favoriteFitPoints,
      locateRef,
      setFromDate,
      setToDate,
      resetDateRange,
      setTypes,
      setRinkTypes,
      setAmenities,
      setSortBy,
      setVenueDisplay,
      onSelect,
      openVenue,
      closeDetail,
      openUser,
      closeUser,
      onBoundsChange,
    }),
    [
      items,
      venues,
      loading,
      favorites,
      userLocation,
      fromDate,
      toDate,
      types,
      rinkTypes,
      amenities,
      sortBy,
      venueDisplay,
      favoritesOnly,
      hideEmpty,
      visibleIndex,
      detailSlug,
      focusVenue,
      mapBounds,
      favoriteFitPoints,
      setFromDate,
      setToDate,
      resetDateRange,
      setTypes,
      setRinkTypes,
      setAmenities,
      setSortBy,
      setVenueDisplay,
      onSelect,
      openVenue,
      closeDetail,
      openUser,
      closeUser,
      onBoundsChange,
    ]
  );

  return (
    <SkatingAppDataContext.Provider value={value}>
      {children}
    </SkatingAppDataContext.Provider>
  );
}
