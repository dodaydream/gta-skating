import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "gta-skating-theme";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

let current: Theme | null = null;

function readDom(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getSnapshot(): Theme {
  if (current === null) current = readDom();
  return current;
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(theme: Theme): void {
  current = theme;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode, blocked): theme still applies.
  }
  for (const listener of listeners) listener();
}

/**
 * Re-apply the persisted (or system) theme to `<html>` without persisting it.
 *
 * Needed after a client navigation that changes a root parameter (e.g.
 * `/en` -> `/fr`): the root layout re-renders and React resets `<html>`'s
 * `className` to the server-rendered value, dropping the `dark` class that
 * `ThemeScript` applied imperatively.
 */
export function syncThemeFromStorage(): void {
  if (typeof document === "undefined") return;
  let stored: Theme | null = null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    stored = raw === "dark" || raw === "light" ? raw : null;
  } catch {
    stored = null;
  }
  const dark =
    stored !== null
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  current = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", dark);
  for (const listener of listeners) listener();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
