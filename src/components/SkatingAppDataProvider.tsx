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
import type { RinkEnvironment, Venue, VenueDisplay } from "@/types/venue";
import type { MapBounds } from "@/types/map";
import type { Coordinates, ProgramItem, ProgramType } from "@/types/schedule";
import { getAreaBounds } from "@/data/areas";
import { fetchPrograms } from "@/api/programs";
import { trackEvent } from "@/lib/analytics";
import { useFavorites } from "@/lib/favorites";
import { getVenueBySlug, getSlugForVenue } from "@/data/venue-meta";
import { useLocale } from "@/i18n/LocaleProvider";

export type SortBy = "time" | "distance";

/**
 * The `area` a landing page is scoped to. Set only by the
 * `/[lang]/areas/[area]` page; it seeds the map bounds (and the initial list
 * filter) and overrides the sidebar heading.
 */
export type SkatingArea = {
  name: string;
  center: Coordinates;
  radiusKm: number;
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

function getSlugFromPath(locale: string): string | null {
  const prefix = `${BASE_PATH}/${locale}/venue/`;
  const { pathname } = window.location;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length);
  return slug ? decodeURIComponent(slug) : null;
}

function pushUrl(locale: string, path: string) {
  window.history.pushState(null, "", `${BASE_PATH}/${locale}${path}`);
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
  selectedIndex: number | null;
  visibleIndex: number | null;
  detailSlug: string | null;
  focusVenue: Coordinates | null;
  mapBounds: MapBounds | null;
  activeArea: SkatingArea | undefined;
  fitBounds: MapBounds | null;
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
  focusVenueSlug: (slug: string) => void;
  onBoundsChange: (bounds: MapBounds, userInitiated: boolean) => void;
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
  initialSlug,
  area,
  children,
}: {
  initialSlug?: string;
  area?: SkatingArea;
  children: ReactNode;
}) {
  const locale = useLocale();
  const locateRef = useRef<(() => void) | null>(null);

  const [fromDate, setFromDateState] = useState("");
  const [toDate, setToDateState] = useState("");
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailSlug, setDetailSlug] = useState<string | null>(
    initialSlug ?? null
  );
  const [focusVenue, setFocusVenue] = useState<Coordinates | null>(() => {
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

  const [types, setTypesState] = useState<ProgramType[]>([]);
  const [rinkTypes, setRinkTypesState] = useState<RinkEnvironment[]>([]);
  const [amenities, setAmenitiesState] = useState<string[]>([]);
  const [sortBy, setSortByState] = useState<SortBy>("time");

  // The area page's fit bounds. The initial map scope reuses this value (rather
  // than computing its own) so the first fetch is already scoped; the map then
  // frames the same bounds (see VenueMap) and every later pan/zoom updates
  // `mapBounds` through the normal flow.
  const fitBounds = useMemo(
    () => (area ? getAreaBounds(area) : null),
    [area]
  );
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(fitBounds);
  // An area page is scoped to its initial bounds only. Once the user changes the
  // map range (pan/zoom) we drop the area scope: the sidebar heading reverts to
  // the generic title and the URL returns to the root.
  const [areaCleared, setAreaCleared] = useState(false);
  const activeArea = areaCleared ? undefined : area;

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const hasSetDate = useRef(false);

  const focusVenueSlug = useCallback((slug: string) => {
    const coords = getVenueBySlug(slug)?.coordinates;
    if (!coords || !isFinite(coords.lat) || !isFinite(coords.lon)) return;
    setFocusVenue({ lat: coords.lat, lon: coords.lon });
  }, []);

  // A venue opened via the URL becomes the map's focus point (initialSlug is
  // handled by the lazy focusVenue initializer above).
  useEffect(() => {
    const onPopState = () => {
      const slug = getSlugFromPath(locale);
      if (slug) {
        const venue = getVenueBySlug(slug);
        if (venue) {
          setDetailSlug(slug);
          focusVenueSlug(slug);
        }
      } else {
        setDetailSlug(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [focusVenueSlug, locale]);

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

  // An area page is scoped to its initial bounds only. Once the user changes the
  // map range (pan/zoom), hand off to the unscoped app at the root route so the
  // sidebar title and list reflect the new, wider scope. The URL is updated in
  // place rather than via the router, so the map and drawer are not remounted.
  const onBoundsChange = useCallback(
    (bounds: MapBounds, userInitiated: boolean) => {
      setMapBounds(bounds);
      if (area && userInitiated) {
        setAreaCleared(true);
        window.history.replaceState(null, "", `${BASE_PATH}/${locale}`);
      }
    },
    [area, locale]
  );

  const onSelect = useCallback(
    (index: number) => {
      const next = selectedIndex === index ? null : index;
      setSelectedIndex(next);
      const venue = next === null ? null : venues[next];
      const slug = venue ? getSlugForVenue(venue.name) : null;
      if (slug) {
        pushUrl(locale, `/venue/${slug}`);
        setDetailSlug(slug);
      } else {
        pushUrl(locale, "");
        setDetailSlug(null);
      }
    },
    [venues, selectedIndex, locale]
  );

  const openVenue = useCallback(
    (venue: Venue) => {
      const slug = getSlugForVenue(venue.name);
      if (!slug) return;
      pushUrl(locale, `/venue/${slug}`);
      setDetailSlug(slug);
      const index = venues.findIndex((v) => v.name === venue.name);
      setSelectedIndex(index >= 0 ? index : null);
    },
    [venues, locale]
  );

  const closeDetail = useCallback(() => {
    pushUrl(locale, "");
    setDetailSlug(null);
    setSelectedIndex(null);
  }, [locale]);

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
  // favourite venue, regardless of the current date/program filters. Area pages
  // suppress this: fitting every favourite could move the camera away from the
  // area.
  const favoriteFitPoints = useMemo<[number, number][] | null>(() => {
    if (area || !favoritesOnly) return null;
    const points: [number, number][] = [];
    for (const slug of favorites) {
      const coords = getVenueBySlug(slug)?.coordinates;
      if (coords && isFinite(coords.lat) && isFinite(coords.lon)) {
        points.push([coords.lon, coords.lat]);
      }
    }
    return points.length > 0 ? points : null;
  }, [area, favoritesOnly, favorites]);

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
      selectedIndex,
      visibleIndex,
      detailSlug,
      focusVenue,
      mapBounds,
      activeArea,
      fitBounds,
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
      focusVenueSlug,
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
      selectedIndex,
      visibleIndex,
      detailSlug,
      focusVenue,
      mapBounds,
      activeArea,
      fitBounds,
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
      focusVenueSlug,
      onBoundsChange,
    ]
  );

  return (
    <SkatingAppDataContext.Provider value={value}>
      {children}
    </SkatingAppDataContext.Provider>
  );
}
