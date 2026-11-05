import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { DeviceCornerRadius } from "@/components/DeviceCornerRadius";
import { I18nProvider } from "@/components/I18nProvider";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = SITE_DESCRIPTION;

const ogImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "GTA Skating — leisure skating, figure skating, shinny, and hockey at rinks across the GTA",
  type: "image/png",
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GTA Skating — Public Skating, Shinny & Figure Skating Schedules",
  description,
  alternates: { canonical: "/" },
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
    title: "GTA Skating — Public Skating, Shinny & Figure Skating Schedules",
    description,
    locale: "en_CA",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "GTA Skating — Public Skating, Shinny & Figure Skating Schedules",
    description,
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <DeviceCornerRadius />
        <I18nProvider>{children}</I18nProvider>
        {adsenseClient ? (
          <Script
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            strategy="afterInteractive"
          />
        ) : null}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}