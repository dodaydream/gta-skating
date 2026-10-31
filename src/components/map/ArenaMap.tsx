"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Arena } from "@/types/arena";

interface ArenaMapProps {
  arenas: Arena[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  locateRef: React.MutableRefObject<(() => void) | null>;
}

const TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const DEFAULT_ZOOM = 12;
const TORONTO: [number, number] = [43.725518, -79.390531];

function pinIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 20px; height: 20px;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      background: ${selected ? "#2563eb" : "#ef4444"};
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

export default function ArenaMap({
  arenas,
  selectedIndex,
  onSelect,
  locateRef,
}: ArenaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: TORONTO,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.scale({
      position: "bottomright",
      metric: true,
      imperial: false,
    }).addTo(map);
    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    locateRef.current = () => {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView(
            [pos.coords.latitude, pos.coords.longitude],
            DEFAULT_ZOOM
          );
        },
        () => {},
        { timeout: 10000, enableHighAccuracy: false }
      );
    };

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      locateRef.current = null;
    };
  }, [locateRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = arenas
      .map((arena, i) => {
        const { lat, lon } = arena.coordinates ?? {};
        if (!isFinite(lat) || !isFinite(lon)) return null;
        const marker = L.marker([lat, lon], {
          icon: pinIcon(false),
          title: arena.name,
        }).addTo(map);
        marker.on("click", () => onSelect(i));
        return marker;
      })
      .filter(Boolean) as L.Marker[];
  }, [arenas, onSelect]);

  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      marker.setIcon(pinIcon(i === selectedIndex));
      if (i === selectedIndex && mapRef.current) {
        mapRef.current.panTo(marker.getLatLng());
      }
    });
  }, [selectedIndex]);

  return <div ref={containerRef} className="h-full w-full" />;
}