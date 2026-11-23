let probe: HTMLDivElement | null = null;

/**
 * Current dynamic viewport height (`100dvh`) in CSS pixels.
 *
 * Reads the same value the engine uses to resolve `dvh`, so JS measurements stay
 * consistent with dvh-based CSS such as the drawer's `--drawer-height`. Using
 * `window.innerHeight` instead drifts by the browser chrome (about 30px on iOS
 * Safari), which is what threw the drawer/map sizing off.
 */
export function viewportHeightPx(): number {
  if (typeof document === "undefined") return 0;
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100dvh;pointer-events:none;visibility:hidden;";
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().height;
}
