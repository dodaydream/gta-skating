import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import React from "react";

const require = createRequire(import.meta.url);
const { ImageResponse } = require("next/og.js");

const h = React.createElement;

const iconData = await readFile(
  join(process.cwd(), "public/icons/icon-512x512.png"),
  "base64",
);
const iconSrc = `data:image/png;base64,${iconData}`;

const el = h(
  "div",
  {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: "linear-gradient(135deg, #0b1120 0%, #1e293b 100%)",
      padding: "72px 80px",
      color: "#f8fafc",
    },
  },
  // Brand row
  h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "20px" } },
    h("img", { src: iconSrc, width: 80, height: 80, style: { borderRadius: 18 } }),
    h("div", { style: { fontSize: 34, fontWeight: 700, letterSpacing: -0.5 } }, "GTA Skating"),
  ),
  // Headline + subhead
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "22px" } },
    h(
      "div",
      { style: { fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 } },
      "Where to skate nearby",
    ),
    h(
      "div",
      { style: { fontSize: 32, color: "#94a3b8", lineHeight: 1.35, maxWidth: 1000 } },
      "Leisure skating, figure skating, shinny, and hockey at rinks across the GTA.",
    ),
  ),
  // Footer
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "12px" } },
    h(
      "div",
      { style: { display: "flex", gap: "16px", fontSize: 26, color: "#38bdf8" } },
      h("span", null, "Live schedules"),
      h("span", { style: { color: "#475569" } }, "\u2022"),
      h("span", null, "Interactive map"),
    ),
    h("div", { style: { fontSize: 26, color: "#64748b" } }, "gtaskating.com"),
  ),
);

const res = new ImageResponse(el, { width: 1200, height: 630 });
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(join(process.cwd(), "public/opengraph-image.png"), buf);
console.log("wrote", buf.length, "bytes");
