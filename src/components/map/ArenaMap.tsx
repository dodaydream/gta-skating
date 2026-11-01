"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  maplibregl.setWorkerUrl(`${basePath}/maplibre-gl-worker.mjs`);
}

import type { Arena } from "@/types/arena";
import type { MapBounds } from "@/types/map";

interface ArenaMapProps {
  arenas: Arena[];
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

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export default function ArenaMap({
  arenas,
  selectedIndex,
  onSelect,
  onBoundsChange,
  userLocation,
  locateRef,
}: ArenaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const centeredOnUserRef = useRef(false);
  const [dark, setDark] = useState(false);

  const arenasRef = useRef(arenas);
  arenasRef.current = arenas;
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

    arenasRef.current.forEach((arena, i) => {
      const { lat, lon } = arena.coordinates ?? {};
      if (!isFinite(lat) || !isFinite(lon)) return;

      const hasPrograms = (arenasRef.current[i].schedule.programs?.length ?? 0) > 0;
      const el = createMarkerElement(i === selectedIndex, hasPrograms, arena.name);
      el.addEventListener("click", () => onSelectRef.current(i));

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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? DARK_STYLE : LIGHT_STYLE,
      center: TORONTO,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric", maxWidth: 120 }),
      "bottom-right",
    );

    locateRef.current = () => {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: DEFAULT_ZOOM,
          });
        },
        () => {},
        { timeout: 10000, enableHighAccuracy: false },
      );
    };

    map.on("load", () => syncMarkers.current?.());

    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    map.on("load", emitBounds);
    map.on("moveend", emitBounds);

    mapRef.current = map;

    return () => {
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
  }, [arenas]);

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
      map.jumpTo({ center: [lon, lat], zoom: DEFAULT_ZOOM });
    }
  }, [userLocation]);

  return <div ref={containerRef} className="h-full w-full" />;
}