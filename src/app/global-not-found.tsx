import type { Metadata, Viewport } from "next";
import { NotFoundDocument } from "@/components/NotFoundDocument";
import { notFoundMetadata, rootViewport } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = notFoundMetadata;

export const viewport: Viewport = rootViewport;

/**
 * Global 404 for unmatched URLs. It bypasses the app's root layouts (there are
 * two, plus a top-level `[lang]` segment), so `NotFoundDocument` renders the
 * `<html>`/`<body>` and wires up styles, fonts, theme, and i18n. Served as
 * `out/404.html`.
 */
export default function GlobalNotFound() {
  return <NotFoundDocument />;
}
