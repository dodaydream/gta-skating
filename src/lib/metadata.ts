import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const SITE_TITLE = "GTA Skating — Public Skating, Shinny & Figure Skating";

const ogImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "GTA Skating — leisure skating, figure skating, shinny, and hockey at rinks across the GTA",
  type: "image/png",
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Site-wide metadata shared by both root layouts (the localized app and the
 * English content pages). Route-level `generateMetadata` overrides the parts
 * that differ per page (title, description, canonical, hreflang).
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    ...(adsenseClient ? { "google-adsense-account": adsenseClient } : {}),
  },
  appleWebApp: {
    capable: true,
    title: "GTA Skating",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "GTA Skating",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_CA",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
};

export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const notFoundMetadata: Metadata = {
  title: "Page not found — GTA Skating Schedule",
  description:
    "The page you were looking for could not be found. Browse skating schedules across the Greater Toronto Area instead.",
  robots: { index: false, follow: true },
};
