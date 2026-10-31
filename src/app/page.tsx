"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import dynamic from "next/dynamic";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/DateFilter";
import { ScheduleSidebar } from "@/components/ui/ScheduleSidebar";
import { ArenaDetailModal } from "@/components/schedule/ArenaDetailModal";
import { getTodayInArenaTime } from "@/data/schedules";

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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailArena, setDetailArena] = useState<Arena | null>(null);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
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
      },
      () => {},
      { timeout: 10000, enableHighAccuracy: false }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams();
    params.set("from", fromDate);
    params.set("to", toDate);
    if (hideEmpty) params.set("hideEmpty", "1");
    fetch(`/api/arenas?${params.toString()}`)
      .then((r) => r.json())
      .then((data: ProgramItem[]) => {
        setItems(data);
        setLoading(false);
      });
  }, [fromDate, toDate, hideEmpty]);

  const arenas = useMemo(() => {
    const seen = new Set<string>();
    const list: Arena[] = [];
    for (const item of items) {
      if (seen.has(item.arena.name)) continue;
      seen.add(item.arena.name);
      const today = getTodayInArenaTime(item.arena.timezone);
      list.push({
        ...item.arena,
        schedule: {
          ...item.arena.schedule,
          events: item.arena.schedule.events.filter(
            (e) => e.date >= today
          ),
        },
      });
    }
    return list;
  }, [items]);

  useEffect(() => {
    if (selectedIndex !== null) {
      setDetailArena(arenas[selectedIndex] ?? null);
    } else {
      setDetailArena(null);
    }
  }, [selectedIndex, arenas]);

  const handleSelect = useCallback(
    (index: number) =>
      setSelectedIndex((prev) => (prev === index ? null : index)),
    []
  );

  const visibleIndex = selectedIndex;

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <ArenaMap
            locateRef={locateRef}
            arenas={arenas}
            selectedIndex={visibleIndex}
            onSelect={handleSelect}
          />

          <div className="absolute left-0 right-0 top-3 z-[1000] flex items-start gap-2 px-4">
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
        />
      </div>

      {detailArena ? (
        <ArenaDetailModal
          arena={detailArena}
          onClose={() => {
            setDetailArena(null);
            setSelectedIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}