import { useSyncExternalStore } from "react";

export const FAVORITES_STORAGE_KEY = "gta-skating-favorites";

const EMPTY: readonly string[] = [];

let favorites: readonly string[] = EMPTY;
let loaded = false;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

function readStored(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const slugs = parsed.filter((v): v is string => typeof v === "string");
    return slugs.length > 0 ? slugs : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  favorites = readStored();
}

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites)
    );
  } catch {
    // Storage unavailable (private mode, blocked): favourites apply for the
    // session only.
  }
}

function subscribe(listener: () => void): () => void {
  ensureLoaded();
  if (!storageListenerAttached && typeof window !== "undefined") {
    storageListenerAttached = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== FAVORITES_STORAGE_KEY) return;
      favorites = readStored();
      emit();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly string[] {
  ensureLoaded();
  return favorites;
}

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

export function useFavorites(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleFavorite(slug: string): void {
  ensureLoaded();
  favorites = favorites.includes(slug)
    ? favorites.filter((s) => s !== slug)
    : [...favorites, slug];
  persist();
  emit();
}
