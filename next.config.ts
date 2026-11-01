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
