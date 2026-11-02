"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  maplibregl.setWorkerUrl(`${basePath}/maplibre-gl-worker.mjs`);
}

import type { Venue } from "@/types/venue";
import type { MapBounds } from "@/types/map";
import { trackEvent } from "@/lib/analytics";

interface VenueMapProps {
  venues: Venue[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  userLocation?: { lat: number; lon: number } | null;
  locateRef: React.MutableRefObject<(() => void) | null>;
}

const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const DEFAULT_ZOOM = 12;
const TORONTO: [number, number] = [-79.390531, 43.725518];

const DESKTOP_WIDTH = 1024;
// Fallback fraction of the viewport the bottom drawer covers when it can't be
// measured (e.g. not mounted yet).
const DRAWER_RATIO_FALLBACK = 0.5;

// Height (in map-canvas pixels) of the strip left visible above the bottom
// drawer. The drawer's height comes from `--drawer-height` (set by the drawer
// from its snap detent), so this is correct without waiting for the open
// animation to settle. Falls back to measuring the drawer's top edge.
function visibleMapHeight(map: maplibregl.Map): number {
  const canvasHeight = map.getCanvas().clientHeight;

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--drawer-height")
    .trim();
  const match = /^([\d.]+)(dvh|vh|%)$/.exec(raw);
  if (match) {
    const fraction = parseFloat(match[1]) / 100;
    const basis =
      match[2] === "%" ? document.documentElement.clientHeight : window.innerHeight;
    return Math.max(1, canvasHeight - fraction * basis);
  }

  let visibleBottom = canvasHeight;
  const mapTop = map.getCanvas().getBoundingClientRect().top;
  for (const drawer of document.querySelectorAll<HTMLElement>(
    '[data-slot="drawer-popup"]',
  )) {
    const top = drawer.getBoundingClientRect().top - mapTop;
    if (top > 0 && top < visibleBottom) visibleBottom = top;
  }
  if (visibleBottom >= canvasHeight) {
    visibleBottom = canvasHeight * (1 - DRAWER_RATIO_FALLBACK);
  }
  return Math.max(1, visibleBottom);
}

// Returns the map center to use so that `lngLat` renders in the middle of the
// area left visible above the drawer. The drawer covers the bottom of the map,
// so the center must move *south* of the target (larger mercator y), which
// pushes the target upward on screen into the visible region.
function offsetForDrawer(
  map: maplibregl.Map,
  lngLat: [number, number],
): [number, number] {
  if (!isMobileViewport()) return lngLat;

  const height = map.getCanvas().clientHeight;
  const targetY = visibleMapHeight(map) / 2;
  const worldSize = 512 * 2 ** DEFAULT_ZOOM;
  const mercator = maplibregl.MercatorCoordinate.fromLngLat({
    lng: lngLat[0],
    lat: lngLat[1],
  });
  // Solve screenY(target) = targetY for the center's mercator y:
  //   screenY = (mercator.y - center.y) * worldSize + height / 2
  const centerY = mercator.y - (targetY - height / 2) / worldSize;
  const shifted = new maplibregl.MercatorCoordinate(
    mercator.x,
    centerY,
    mercator.z,
  ).toLngLat();
  return [shifted.lng, shifted.lat];
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < DESKTOP_WIDTH;
}

function createMarkerElement(
  selected: boolean,
  hasPrograms: boolean,
  name: string
): HTMLDivElement {
  const el = document.createElement("div");
  const pinSize = selected ? 32 : 20;
  el.style.cssText = selected
    ? "display:flex;flex-direction:column;align-items:center;gap:8px;"
    : "";
  el.innerHTML = `<div style="
    width:${pinSize}px;height:${pinSize}px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${selected ? "#2563eb" : hasPrograms ? "#22c55e" : "#ef4444"};
    border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;
    transition:width .2s,height .2s;
  "></div>${selected ? `<span style="
    font-size:11px;font-weight:600;line-height:1.2;
    color:#fff;text-align:center;max-width:160px;
    text-shadow:0 1px 2px rgba(0,0,0,.6);
  ">${name}</span>` : ""}`;
  return el;
}

function createUserDotElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:20px;height:20px;";
  el.innerHTML = `
    <span style="position:absolute;inset:0;border-radius:9999px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
    <span style="position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);border-radius:9999px;background:#2563eb;"></span>`;
  return el;
}

const SCALE_MAX_WIDTH = 120;

function roundScaleDistance(value: number): number {
  const magnitude = Math.pow(10, `${Math.floor(value)}`.length - 1);
  const fraction = value / magnitude;
  const nice =
    fraction >= 10
      ? 10
      : fraction >= 5
        ? 5
        : fraction >= 3
          ? 3
          : fraction >= 2
            ? 2
            : fraction >= 1
              ? 1
              : fraction;
  return magnitude * nice;
}

function formatMetric(meters: number): string {
  return meters >= 1000
    ? `${Math.round(meters / 1000)} km`
    : `${Math.round(meters)} m`;
}

class ScaleLegend implements maplibregl.IControl {
  private map: maplibregl.Map | null = null;
  private container: HTMLDivElement | null = null;
  private bar: HTMLElement | null = null;
  private label: HTMLElement | null = null;

  constructor(private readonly maxWidth = SCALE_MAX_WIDTH) {}

  getDefaultPosition(): maplibregl.ControlPosition {
    return "bottom-left";
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement("div");
    container.className =
      "maplibregl-ctrl inline-flex flex-col items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[10px] leading-none shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-black/60";
    container.innerHTML = `
      <span data-slot="label" class="whitespace-nowrap font-semibold tracking-tight tabular-nums text-zinc-800 dark:text-zinc-100"></span>
      <span data-slot="bar" class="relative block h-1.5">
        <span class="absolute inset-y-0 left-0 w-0.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
        <span class="absolute inset-y-0 right-0 w-0.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
        <span class="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-blue-600/40 dark:bg-blue-400/40"></span>
      </span>
    `;

    this.bar = container.querySelector<HTMLElement>('[data-slot="bar"]');
    this.label = container.querySelector<HTMLElement>('[data-slot="label"]');

    map.on("move", this.update);
    map.on("projectiontransition", this.update);
    map.on("resize", this.update);
    this.update();

    this.container = container;
    return container;
  }

  onRemove(): void {
    const map = this.map;
    if (map) {
      map.off("move", this.update);
      map.off("projectiontransition", this.update);
      map.off("resize", this.update);
    }
    this.container?.remove();
    this.container = null;
    this.bar = null;
    this.label = null;
    this.map = null;
  }

  private update = (): void => {
    const map = this.map;
    const bar = this.bar;
    if (!map || !bar) return;

    const { clientWidth, clientHeight } = map.getCanvas();
    if (!clientWidth || !clientHeight) return;

    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const left = map.unproject([centerX - this.maxWidth / 2, centerY]);
    const right = map.unproject([centerX + this.maxWidth / 2, centerY]);
    if (!left || !right) return;

    const maxMeters = left.distanceTo(right);
    if (!Number.isFinite(maxMeters) || maxMeters <= 0) return;

    const meters = roundScaleDistance(maxMeters);
    const width = Math.max(
      28,
      Math.round(((meters / maxMeters) * this.maxWidth) / 0.5) * 0.5,
    );

    bar.style.width = `${width}px`;
    if (this.label) this.label.textContent = formatMetric(meters);
  };
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export default function VenueMap({
  venues,
  selectedIndex,
  onSelect,
  onBoundsChange,
  userLocation,
  locateRef,
}: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const centeredOnUserRef = useRef(false);
  const boundsTrackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dark, setDark] = useState(false);

  const venuesRef = useRef(venues);
  venuesRef.current = venues;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  const syncMarkers = useRef(() => {});
  syncMarkers.current = () => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    venuesRef.current.forEach((venue, i) => {
      const { lat, lon } = venue.coordinates ?? {};
      if (!isFinite(lat) || !isFinite(lon)) return;

      const hasPrograms = (venuesRef.current[i].schedule.programs?.length ?? 0) > 0;
      const el = createMarkerElement(i === selectedIndex, hasPrograms, venue.name);
      el.addEventListener("click", () => {
        trackEvent("arena_click", { arena_name: venue.name });
        onSelectRef.current(i);
      });

      const isSelected = i === selectedIndex;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map);
      if (isSelected) {
        marker.getElement().style.zIndex = "2";
      }
      markersRef.current.push(marker);
    });
  };

  const updateSelected = useRef(() => {});
  updateSelected.current = () => {
    syncMarkers.current();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: dark ? DARK_STYLE : LIGHT_STYLE,
        center: TORONTO,
        zoom: DEFAULT_ZOOM,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new ScaleLegend(), "bottom-left");
    } catch {
      // WebGL2 unsupported/unavailable: skip the map so the rest of the app still works.
      return;
    }

    map.on("load", () => {
      // Don't override a user-location centering that already happened.
      if (!centeredOnUserRef.current) {
        map.setCenter(offsetForDrawer(map, TORONTO));
      }
      syncMarkers.current?.();
    });

    locateRef.current = () => {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          map.flyTo({
            center: offsetForDrawer(map, center),
            zoom: DEFAULT_ZOOM,
          });
        },
        () => {},
        { timeout: 10000, enableHighAccuracy: false },
      );
    };

    const emitBounds = () => {
      const b = map.getBounds();
      const bounds: MapBounds = {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      };
      onBoundsChangeRef.current?.(bounds);
      if (boundsTrackTimerRef.current) clearTimeout(boundsTrackTimerRef.current);
      boundsTrackTimerRef.current = setTimeout(() => {
        trackEvent("map_bounds_change", {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west,
        });
      }, 500);
    };
    map.on("load", emitBounds);
    map.on("moveend", emitBounds);

    mapRef.current = map;

    return () => {
      if (boundsTrackTimerRef.current) clearTimeout(boundsTrackTimerRef.current);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      userMarkerRef.current = null;
      centeredOnUserRef.current = false;
      locateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    mq.addEventListener("change", () => setDark(isDarkMode()));
    setDark(isDarkMode());

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", () => setDark(isDarkMode()));
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(dark ? DARK_STYLE : LIGHT_STYLE);
    map.once("style.load", () => syncMarkers.current?.());
  }, [dark]);

  useEffect(() => {
    updateSelected.current?.();
  }, [selectedIndex]);

  useEffect(() => {
    if (mapRef.current?.loaded()) {
      syncMarkers.current?.();
    }
  }, [venues]);

  useEffect(() => {
    const map = mapRef.current;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (!map || !userLocation) return;
    const { lat, lon } = userLocation;
    if (!isFinite(lat) || !isFinite(lon)) return;
    userMarkerRef.current = new maplibregl.Marker({
      element: createUserDotElement(),
    })
      .setLngLat([lon, lat])
      .addTo(map);
    if (!centeredOnUserRef.current) {
      centeredOnUserRef.current = true;
      const center: [number, number] = [lon, lat];
      map.jumpTo({
        center: offsetForDrawer(map, center),
        zoom: DEFAULT_ZOOM,
      });
    }
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}