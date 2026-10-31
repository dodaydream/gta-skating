import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The app is exported as a fully static site for GitHub Pages. A project site
// is served from /<repo>/, so CI passes that prefix (e.g. "/gta-skating").
// Leave unset for a custom domain / user site (served from /).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  /* config options here */
  // Static export for GitHub Pages: the build emits plain HTML/CSS/JS into
  // `out/`. Cache Components/PPR require a Node.js server, so they are off.
  output: "export",
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
