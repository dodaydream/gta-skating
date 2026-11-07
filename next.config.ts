import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The app is deployed to the custom domain gtaskating.com and served from the
// site root, so no base path is required.
const basePath = "";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow the dev server to be reached from other hosts on the LAN (e.g. a
  // phone testing http://172.16.100.139:3000). Dev-only; ignored in production.
  allowedDevOrigins: ["172.16.100.139"],
  // Static export for GitHub Pages: the build emits plain HTML/CSS/JS into
  // `out/`. Cache Components/PPR require a Node.js server, so they are off.
  //
  // Only for `next build` (NODE_ENV=production). A normal dev server renders
  // unmatched/invalid params and 404s via `notFound()`, whereas `output:
  // "export"` makes the dev server hard-error on any param that isn't in
  // `generateStaticParams()`.
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  // The app has two root layouts (`(app)` and `(content)`) and a top-level
  // `[lang]` segment, so a global 404 can't be composed from a single layout.
  // `global-not-found.tsx` renders the 404 for unmatched URLs (out/404.html).
  experimental: {
    globalNotFound: true,
  },
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
