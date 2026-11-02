"use client";

import { useEffect } from "react";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getIPhoneCornerRadius(): number {
  if (isStandalone()) return 0;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return 0;

  const w = window.screen.width;
  const h = window.screen.height;
  const longSide = Math.max(w, h);
  const shortSide = Math.min(w, h);
  const dpr = window.devicePixelRatio;

  if (shortSide === 440 && longSide === 956) return 62; // 16/17 Pro Max
  if (shortSide === 402 && longSide === 874) return 62; // 16/17 Pro
  if (shortSide === 430 && longSide === 932) return 55; // 14 Pro Max, 15/16 Plus
  if (shortSide === 393 && longSide === 852) return 55; // 14 Pro, 15, 16
  if (shortSide === 428 && longSide === 926) return 53.33; // 12/13 Pro Max, 14 Plus
  if (shortSide === 390 && longSide === 844) return 47.33; // 12/13/14
  if (shortSide === 375 && longSide === 812) return dpr >= 3 ? 39 : 44; // X/11 Pro vs mini
  if (shortSide === 414 && longSide === 896) return 41.5; // XR, 11
  return 0;
}

export function DeviceCornerRadius() {
  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty(
        "--device-corner-radius",
        `${getIPhoneCornerRadius()}px`
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return null;
}
