"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Arena } from "@/types/arena";
import type { MapBounds } from "@/types/map";
import type { ProgramItem } from "@/types/schedule";
import dynamic from "next/dynamic";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/DateFilter";
import { ScheduleSidebar } from "@/components/ui/ScheduleSidebar";
import { ArenaDetailModal } from "@/components/schedule/ArenaDetailModal";
import { fetchPrograms } from "@/api/programs";

const ArenaMap = dynamic(() => import("@/components/map/ArenaMap"), {
  ssr: false,
});

function todayRange(): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return [`${y}-${m}-${d}T${h}:${min}`, `${y}-${m}-${d}T23:59`];
}

export default function Home() {
  const locateRef = useRef<(() => void) | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailArena, setDetailArena] = useState<Arena | null>(null);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationResolved, setLocationResolved] = useState(
    () => typeof navigator === "undefined" || !("geolocation" in navigator)
  );
  const hasSetDate = useRef(false);

  useEffect(() => {
    if (hasSetDate.current) return;
    hasSetDate.current = true;
    const [f, t] = todayRange();
    setFromDate(f);
    setToDate(t);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setUserLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationResolved(true);
      },
      () => {
        if (!cancelled) setLocationResolved(true);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate || !locationResolved) return;
    let cancelled = false;
    void fetchPrograms({
      from: fromDate,
      to: toDate,
      hideEmpty,
      bounds: mapBounds,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setArenas(result.arenas);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, hideEmpty, mapBounds, locationResolved]);

  useEffect(() => {
    if (selectedIndex === null) {
      setDetailArena(null);
      return;
    }
    const arena = arenas[selectedIndex];
    if (!arena) {
      setSelectedIndex(null);
      setDetailArena(null);
      return;
    }
    setDetailArena(arena);
  }, [selectedIndex, arenas]);

  const handleSelect = useCallback(
    (index: number) =>
      setSelectedIndex((prev) => (prev === index ? null : index)),
    []
  );

  const visibleIndex = selectedIndex;

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <ArenaMap
            locateRef={locateRef}
            arenas={arenas}
            selectedIndex={visibleIndex}
            onSelect={handleSelect}
            onBoundsChange={setMapBounds}
            userLocation={userLocation}
          />

          <div className="absolute left-0 right-0 top-3 z-40 flex items-start gap-2 px-4">
            <Button
              variant="secondary"
              size="icon"
              className="shadow-xs"
              onClick={() => locateRef.current?.()}
              title="Centre on your location"
            >
              <IconLocation className="size-4" />
            </Button>
            <FilterChips
              from={fromDate}
              to={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
              onClear={() => {
                const [f, t] = todayRange();
                setFromDate(f);
                setToDate(t);
              }}
              hideEmpty={hideEmpty}
              onHideEmptyChange={setHideEmpty}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        <ScheduleSidebar
          loading={loading}
          items={items}
          hideEmpty={hideEmpty}
          onHideEmptyChange={setHideEmpty}
          userLocation={userLocation}
          onSelectArena={setDetailArena}
          detailOpen={detailArena !== null}
        />
      </div>

      {detailArena ? (
        <ArenaDetailModal
          key={detailArena.name}
          arenaName={detailArena.name}
          userLocation={userLocation}
          onClose={() => {
            setDetailArena(null);
            setSelectedIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}