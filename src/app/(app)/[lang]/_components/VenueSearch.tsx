"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { cn } from "cn";
import {
  IconChevronLeft,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconX,
} from "@tabler/icons-react";
import type { VenueMeta } from "@/types/venue";
import { venueMeta, getSlugForVenue } from "@/data/venue-meta";
import { distanceKm, formatDistance } from "@/lib/schedule";
import { toggleFavorite } from "@/lib/favorites";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useSkatingAppData } from "./SkatingAppDataProvider";

const fuse = new Fuse(venueMeta, {
  keys: ["name", "address"],
  threshold: 0.4,
  ignoreLocation: true,
});

/**
 * Search button (top bar) that opens a full-screen overlay for finding a venue
 * by name or address. Searching is global — it is independent of the map
 * viewport and the active filters. Selecting a result opens the venue.
 */
export function VenueSearch() {
  const { t } = useTranslation();
  const { userLocation, favorites, openVenueBySlug } = useSkatingAppData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const trimmed = query.trim();
    const matches = trimmed
      ? fuse.search(trimmed).map((result) => ({
          venue: result.item,
          score: result.score ?? 0,
        }))
      : venueMeta.map((venue) => ({ venue, score: 0 }));
    const distanceTo = (venue: VenueMeta) => {
      const c = venue.coordinates;
      if (!userLocation || !c || !isFinite(c.lat) || !isFinite(c.lon)) {
        return null;
      }
      return distanceKm(userLocation.lat, userLocation.lon, c.lat, c.lon);
    };
    // Best match first, then nearest.
    return matches
      .map((entry) => ({ ...entry, distance: distanceTo(entry.venue) }))
      .sort(
        (a, b) =>
          a.score - b.score ||
          (a.distance ?? Infinity) - (b.distance ?? Infinity),
      );
  }, [query, userLocation]);

  function select(venue: VenueMeta) {
    openVenueBySlug(getSlugForVenue(venue.name));
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        className="shadow-xs"
        aria-label={t("sidebar.search")}
        title={t("sidebar.search")}
        onClick={() => setOpen(true)}
      >
        <IconSearch />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 right-0 bottom-0 translate-x-0 translate-y-0 flex h-dvh max-w-none flex-col gap-0 rounded-none p-0"
        >
          <DialogTitle className="sr-only">{t("sidebar.search")}</DialogTitle>
          <div role="status" className="sr-only">
            {t("a11y.venueResultCount", { count: results.length })}
          </div>

          <div className="flex items-center gap-2 border-b p-2.5">
            <button
              type="button"
              aria-label={t("sidebar.back")}
              onClick={() => setOpen(false)}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <IconChevronLeft className="size-6" />
            </button>
            <InputGroup className="h-9 flex-1 border-0 bg-muted shadow-none has-[[data-slot=input-group-control]:focus-visible]:border-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-input/30">
              <InputGroupAddon align="inline-start">
                <IconSearch aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("sidebar.searchVenues")}
                aria-label={t("sidebar.searchVenues")}
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={t("sidebar.clearSearch")}
                    onClick={() => setQuery("")}
                  >
                    <IconX aria-hidden />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {results.length === 0 ? (
              <Empty className="my-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconSearch aria-hidden />
                  </EmptyMedia>
                  <EmptyTitle>{t("sidebar.noVenueMatches")}</EmptyTitle>
                  <EmptyDescription>
                    {t("sidebar.noVenueMatchesHint")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col">
                {results.map(({ venue, distance }) => {
                  const slug = getSlugForVenue(venue.name);
                  const favorite = favorites.includes(slug);
                  return (
                    <li key={venue.id}>
                      <div className="flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted">
                        <button
                          type="button"
                          onClick={() => select(venue)}
                          className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-3 py-2 text-left outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <span className="truncate text-sm font-medium text-foreground">
                            {venue.name}
                          </span>
                          <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
                            <span className="min-w-0 truncate">
                              {venue.address}
                            </span>
                            {distance !== null ? (
                              <span className="shrink-0">
                                {formatDistance(distance)}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleFavorite(slug);
                            trackEvent(
                              favorite ? "venue_unfavorite" : "venue_favorite",
                              { venue: slug },
                            );
                          }}
                          aria-pressed={favorite}
                          aria-label={
                            favorite
                              ? t("venue.unfavorite")
                              : t("venue.favorite")
                          }
                          title={
                            favorite
                              ? t("venue.unfavorite")
                              : t("venue.favorite")
                          }
                          className={cn(
                            "shrink-0 rounded-lg p-1.5 transition-colors",
                            favorite
                              ? "text-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
                              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200",
                          )}
                        >
                          {favorite ? (
                            <IconStarFilled className="size-5" />
                          ) : (
                            <IconStar className="size-5" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
