"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Arena } from "@/types/arena";
import type { MapBounds } from "@/types/map";
import type { ProgramItem, ProgramType } from "@/types/schedule";
import dynamic from "next/dynamic";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/DateFilter";
import { FilterBar } from "@/components/ui/FilterBar";
import { ScheduleSidebar } from "@/components/ui/ScheduleSidebar";
import { ArenaDetailModal } from "@/components/schedule/ArenaDetailModal";
import { fetchPrograms } from "@/api/programs";
import { trackEvent } from "@/lib/analytics";
import { getArenaBySlug, getSlugForArena } from "@/data/schedules";

const ArenaMap = dynamic(() => import("@/components/map/ArenaMap"), {
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
  const prefix = `${BASE_PATH}/arena/`;
  const { pathname } = window.location;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length);
  return slug ? decodeURIComponent(slug) : null;
}

function pushUrl(path: string) {
  window.history.pushState(null, "", `${BASE_PATH}${path}`);
}

export default function SkatingApp({ initialSlug }: { initialSlug?: string }) {
  const locateRef = useRef<(() => void) | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [detailSlug, setDetailSlug] = useState<string | null>(initialSlug ?? null);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [types, setTypes] = useState<ProgramType[]>([]);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
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
    const onPopState = () => {
      const slug = getSlugFromPath();
      if (slug) {
        const arena = getArenaBySlug(slug);
        if (arena) {
          setDetailSlug(slug);
        }
      } else {
        setDetailSlug(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
  }, [fromDate, toDate, hideEmpty, types, mapBounds]);

  const handleSelect = useCallback(
    (index: number) => {
      const next = selectedIndex === index ? null : index;
      setSelectedIndex(next);
      const arena = next === null ? null : arenas[next];
      const slug = arena ? getSlugForArena(arena.name) : null;
      if (slug) {
        pushUrl(`/arena/${slug}`);
        setDetailSlug(slug);
      } else {
        pushUrl("/");
        setDetailSlug(null);
      }
    },
    [arenas, selectedIndex]
  );

  const visibleIndex = selectedIndex;

  const handleOpenArena = useCallback((arena: Arena) => {
    const slug = getSlugForArena(arena.name);
    if (slug) {
      pushUrl(`/arena/${slug}`);
      setDetailSlug(slug);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    pushUrl("/");
    setDetailSlug(null);
    setSelectedIndex(null);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
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

          <div className="absolute left-0 right-0 top-[calc(var(--safe-top)_+_0.75rem)] z-40 pl-[calc(var(--safe-left)_+_1rem)] pr-[calc(var(--safe-right)_+_1rem)] lg:top-[calc(var(--safe-top)_+_1.5rem)] lg:pl-[calc(var(--safe-left)_+_1.5rem)] lg:pr-[calc(var(--safe-right)_+_1.5rem)]">
            <FilterBar>
              <Button
                variant="secondary"
                size="icon-lg"
                className="shadow-xs"
                onClick={() => {
                  trackEvent("locate_me");
                  locateRef.current?.();
                }}
                title="Centre on your location"
              >
                <IconLocation className="size-4" />
              </Button>
              <FilterChips
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
                hideEmpty={hideEmpty}
                onHideEmptyChange={(v) => {
                  setHideEmpty(v);
                  trackEvent("hide_empty_toggle", { hidden: v });
                }}
                types={types}
                onTypesChange={(next) => {
                  setTypes(next);
                  trackEvent("type_filter_change", { types: next.join(",") });
                }}
              />
            </FilterBar>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        <ScheduleSidebar
          loading={loading}
          items={items}
          hideEmpty={hideEmpty}
          onHideEmptyChange={(v) => {
            setHideEmpty(v);
            trackEvent("hide_empty_toggle", { hidden: v });
          }}
          userLocation={userLocation}
          onSelectArena={handleOpenArena}
          detailOpen={detailSlug !== null}
        />
      </div>

      {detailSlug ? (
        <ArenaDetailModal
          key={detailSlug}
          slug={detailSlug}
          userLocation={userLocation}
          onClose={handleCloseDetail}
        />
      ) : null}
    </div>
  );
}