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
  // `userInitiated` is true only for DOM-driven moves (drag/scroll/rotate),
  // not for programmatic camera changes (initial framing, geolocation, drawer
  // resizes). It lets the area pages hand off to the unscoped app on user pan.
  onBoundsChange?: (bounds: MapBounds, userInitiated: boolean) => void;
  userLocation?: { lat: number; lon: number } | null;
  locateRef: React.MutableRefObject<(() => void) | null>;
  focusVenue?: { lat: number; lon: number } | null;
  // Initial camera bounds, e.g. the area a landing page is scoped to. Fitted
  // once when the map loads; later panning/zooming takes over normally.
  fitBounds?: MapBounds | null;
  // When set (favourites-only filter), the map scales to fit these [lng, lat]
  // points. Changes are keyed by the point set, so panning is preserved until
  // the set itself changes.
  fitTo?: [number, number][] | null;
}

const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const DEFAULT_ZOOM = 12;
const TORONTO: [number, number] = [-79.390531, 43.725518];

const DESKTOP_WIDTH = 1024;

// Height (in map-canvas pixels) of the strip left visible above the bottom
// drawer. On mobile the list drawer snaps to half the viewport, so the visible
// map height is the top 50dvh.
function visibleMapHeight(map: maplibregl.Map): number {
  if (isMobileViewport()) {
    return Math.max(1, window.innerHeight * 0.5);
  }
  return map.getCanvas().clientHeight;
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

// Padding used when fitting the camera to a set of venues: keep markers clear
// of the floating filter bar at the top and, on mobile, of the list drawer at
// the bottom.
function fitPadding(map: maplibregl.Map): maplibregl.PaddingOptions {
  const horizontal = 48;
  const top = 80;
  if (isMobileViewport()) {
    const bottom =
      Math.max(0, map.getCanvas().clientHeight - visibleMapHeight(map)) + 24;
    return { top, bottom, left: horizontal, right: horizontal };
  }
  return { top, bottom: 48, left: horizontal, right: horizontal };
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
    animation:${selected ? "arena-pin-pop .2s ease-out" : "none"};
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
    return "bottom-right";
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement("div");
    container.dataset.slot = "scale-legend";
    container.className =
      "maplibregl-ctrl inline-flex flex-col items-center gap-0.5 text-[10px] font-medium leading-none [text-shadow:0_1px_2px_rgba(255,255,255,0.9)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]";
    container.innerHTML = `
      <span data-slot="label" class="whitespace-nowrap tracking-tight tabular-nums text-zinc-800 dark:text-zinc-100"></span>
      <span data-slot="bar" class="relative block h-1.5 w-0 border-b border-zinc-800 dark:border-zinc-100">
        <span class="absolute inset-y-0 left-0 w-px bg-zinc-800 dark:bg-zinc-100"></span>
        <span class="absolute inset-y-0 right-0 w-px bg-zinc-800 dark:bg-zinc-100"></span>
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

    // The bar's total width maps to a nicely-rounded distance at the current
    // map scale.
    const meters = roundScaleDistance(maxMeters);
    const width = (meters / maxMeters) * this.maxWidth;

    bar.style.width = `${width}px`;
    if (this.label) this.label.textContent = formatMetric(meters);
  };
}

const ATTRIBUTION_LINK_CLASS =
  "text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200";

class AttributionControl implements maplibregl.IControl {
  getDefaultPosition(): maplibregl.ControlPosition {
    return "bottom-right";
  }

  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.dataset.slot = "attribution";
    container.className =
      "maplibregl-ctrl inline-flex flex-wrap items-center gap-x-1 text-[8px] leading-tight text-zinc-700 lg:text-[10px] [text-shadow:0_1px_2px_rgba(255,255,255,0.9)] dark:text-zinc-200 dark:[text-shadow:none]";
    container.innerHTML =
      `<a href="https://maplibre.org" target="_blank" rel="noopener noreferrer" class="${ATTRIBUTION_LINK_CLASS}">MapLibre</a>` +
      `<span class="text-zinc-400 dark:text-zinc-500" aria-hidden="true">|</span>` +
      `<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" class="${ATTRIBUTION_LINK_CLASS}">OpenFreeMap</a>` +
      `<a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer" class="${ATTRIBUTION_LINK_CLASS}">© OpenMapTiles</a>` +
      `<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="${ATTRIBUTION_LINK_CLASS}">Data from OpenStreetMap</a>`;
    return container;
  }

  onRemove(): void {}
}

const ZOOM_BUTTON_CLASS =
  "flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset";

const ZOOM_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">`;

class ZoomControl implements maplibregl.IControl {
  private map: maplibregl.Map | null = null;
  private container: HTMLDivElement | null = null;
  private zoomInButton: HTMLButtonElement | null = null;
  private zoomOutButton: HTMLButtonElement | null = null;

  getDefaultPosition(): maplibregl.ControlPosition {
    return "top-right";
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement("div");
    container.dataset.slot = "zoom-control";
    container.className =
      "maplibregl-ctrl inline-flex flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-sm";
    container.innerHTML = `
      <button type="button" data-slot="zoom-in" aria-label="Zoom in" title="Zoom in" class="${ZOOM_BUTTON_CLASS}">
        ${ZOOM_ICON}<path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>
      <button type="button" data-slot="zoom-out" aria-label="Zoom out" title="Zoom out" class="${ZOOM_BUTTON_CLASS} border-t border-border">
        ${ZOOM_ICON}<path d="M5 12h14"/></svg>
      </button>
    `;

    this.zoomInButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="zoom-in"]',
    );
    this.zoomOutButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="zoom-out"]',
    );

    this.zoomInButton?.addEventListener("click", this.handleZoomIn);
    this.zoomOutButton?.addEventListener("click", this.handleZoomOut);

    map.on("zoom", this.update);
    this.update();

    this.container = container;
    return container;
  }

  onRemove(): void {
    const map = this.map;
    if (map) map.off("zoom", this.update);
    this.zoomInButton?.removeEventListener("click", this.handleZoomIn);
    this.zoomOutButton?.removeEventListener("click", this.handleZoomOut);
    this.container?.remove();
    this.container = null;
    this.zoomInButton = null;
    this.zoomOutButton = null;
    this.map = null;
  }

  private handleZoomIn = (): void => {
    this.map?.zoomIn();
  };

  private handleZoomOut = (): void => {
    this.map?.zoomOut();
  };

  private update = (): void => {
    const map = this.map;
    if (!map) return;
    const zoom = map.getZoom();
    if (this.zoomInButton) this.zoomInButton.disabled = zoom >= map.getMaxZoom();
    if (this.zoomOutButton) this.zoomOutButton.disabled = zoom <= map.getMinZoom();
  };
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  // The app always reflects the active theme as a `dark` class on <html> (set by
  // the inline boot script and by setTheme), so that class is the single source
  // of truth. Consulting `prefers-color-scheme` here would pin the map to the OS
  // preference and ignore the in-app toggle.
  return document.documentElement.classList.contains("dark");
}

export default function VenueMap({
  venues,
  selectedIndex,
  onSelect,
  onBoundsChange,
  userLocation,
  locateRef,
  focusVenue,
  fitBounds,
  fitTo,
}: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const centeredOnUserRef = useRef(false);
  const fitSignatureRef = useRef<string | null>(null);
  const fitBoundsSignatureRef = useRef<string | null>(null);
  const fitBoundsRef = useRef(fitBounds);
  useEffect(() => {
    fitBoundsRef.current = fitBounds;
  }, [fitBounds]);
  const boundsTrackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedStyleRef = useRef<string | null>(null);
  const [dark, setDark] = useState(() => isDarkMode());
  const [mapReady, setMapReady] = useState(false);

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
      const initialStyle = dark ? DARK_STYLE : LIGHT_STYLE;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle,
        center: TORONTO,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });
      appliedStyleRef.current = initialStyle;

      map.addControl(new ZoomControl(), "top-right");
      map.addControl(new AttributionControl(), "bottom-right");
      map.addControl(new ScaleLegend(), "bottom-right");

      // The style references sprite images that may be absent; register a
      // resolver that substitutes a transparent 1x1 image. MapLibre awaits the
      // resolver before treating an image as missing, so this suppresses the
      // "could not be loaded" warning (the `styleimagemissing` event does not).
      map.setMissingStyleImageResolver((id) => {
        if (!map.hasImage(id)) {
          map.addImage(id, {
            width: 1,
            height: 1,
            data: new Uint8Array(4),
          });
        }
      });
    } catch {
      // WebGL2 unsupported/unavailable: skip the map so the rest of the app still works.
      return;
    }

    map.on("load", () => {
      if (fitBoundsRef.current) {
        // Frame the area (landing pages) once the map is ready; taking the
        // camera also suppresses the one-shot user-location centering below.
        centeredOnUserRef.current = true;
      } else if (!centeredOnUserRef.current) {
        // Don't override a user-location centering that already happened.
        map.setCenter(offsetForDrawer(map, TORONTO));
      }
      setMapReady(true);
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

    const emitBounds = (userInitiated: boolean) => {
      const b = map.getBounds();
      // On mobile the floating drawer covers the bottom of the map. The visible
      // map height is `height - drawerHeight`, so clamp the southern edge to
      // that line: venues behind the drawer are background, not list entries.
      let south = b.getSouth();
      if (isMobileViewport()) {
        const bottom = map.unproject([0, visibleMapHeight(map)]);
        if (Number.isFinite(bottom.lat)) south = bottom.lat;
      }
      const bounds: MapBounds = {
        west: b.getWest(),
        south,
        east: b.getEast(),
        north: b.getNorth(),
      };
      onBoundsChangeRef.current?.(bounds, userInitiated);
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
    map.on("load", () => {
      // An area page already seeded these bounds; skip the map's own load emit
      // so the initial frame (`fitBounds` effect below) is what gets emitted.
      if (!fitBoundsRef.current) emitBounds(false);
    });
    map.on("moveend", (e) => emitBounds(Boolean(e.originalEvent)));

    // Re-clamp when the drawer's snap detent changes `--drawer-height`.
    let lastDrawerHeight = document.documentElement.style.getPropertyValue(
      "--drawer-height",
    );
    const drawerObserver = new MutationObserver(() => {
      const next = document.documentElement.style.getPropertyValue(
        "--drawer-height",
      );
      if (next === lastDrawerHeight) return;
      lastDrawerHeight = next;
      emitBounds(false);
    });
    drawerObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    mapRef.current = map;

    return () => {
      if (boundsTrackTimerRef.current) clearTimeout(boundsTrackTimerRef.current);
      drawerObserver.disconnect();
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
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const next = dark ? DARK_STYLE : LIGHT_STYLE;
    // Skip when the style is already applied (e.g. the initial mount), so we
    // don't trigger a full style rebuild before the style has finished loading.
    if (appliedStyleRef.current === next) return;
    appliedStyleRef.current = next;

    map.setStyle(next);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusVenue) return;
    const { lat, lon } = focusVenue;
    if (!isFinite(lat) || !isFinite(lon)) return;
    // A venue focused from the URL takes precedence over user-location centering.
    centeredOnUserRef.current = true;
    map.flyTo({
      center: offsetForDrawer(map, [lon, lat]),
      zoom: DEFAULT_ZOOM,
    });
  }, [focusVenue, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !fitBounds) return;
    const signature = `${fitBounds.west},${fitBounds.south},${fitBounds.east},${fitBounds.north}`;
    if (fitBoundsSignatureRef.current === signature) return;
    fitBoundsSignatureRef.current = signature;

    // Frame the area. The zoom is derived from the area's size (approximate),
    // not the drawer padding, so the viewport roughly equals the area; the
    // normal bounds flow then scopes the list to it. Framing takes the camera,
    // so suppress the one-shot user-location centering too.
    centeredOnUserRef.current = true;
    const lat = (fitBounds.north + fitBounds.south) / 2;
    const lon = (fitBounds.west + fitBounds.east) / 2;
    const radiusKm = ((fitBounds.north - fitBounds.south) / 2) * 111.32;
    const targetPx = Math.max(
      1,
      Math.min(map.getCanvas().clientWidth, visibleMapHeight(map)) * 0.9,
    );
    // MapLibre tiles are 512px, so meters/px = (156543/2) * cos(lat) / 2^zoom.
    const metersPerPixel = (radiusKm * 2000) / targetPx;
    const zoom = Math.min(
      16,
      Math.log2(
        (78271.5 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel,
      ),
    );
    map.jumpTo({ center: offsetForDrawer(map, [lon, lat]), zoom });
  }, [fitBounds, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!fitTo || fitTo.length === 0) {
      fitSignatureRef.current = null;
      return;
    }
    const signature = fitTo.map((p) => `${p[0]},${p[1]}`).join(";");
    if (fitSignatureRef.current === signature) return;
    fitSignatureRef.current = signature;

    // Fitting to the favourites takes the camera, so suppress the one-shot
    // user-location centering that may still be pending.
    centeredOnUserRef.current = true;

    if (fitTo.length === 1) {
      map.easeTo({
        center: offsetForDrawer(map, fitTo[0]),
        zoom: DEFAULT_ZOOM,
        duration: 600,
      });
      return;
    }
    const bounds = new maplibregl.LngLatBounds(fitTo[0], fitTo[0]);
    for (const point of fitTo) bounds.extend(point);
    map.fitBounds(bounds, {
      padding: fitPadding(map),
      maxZoom: DEFAULT_ZOOM,
      duration: 800,
    });
  }, [fitTo, mapReady]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}