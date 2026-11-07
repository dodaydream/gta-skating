/**
 * Driver that runs every per-venue scraper found under ./scraper (each venue is
 * a sub-folder containing a scrape.ts entry that runs on import).
 *
 * Usage:  node scraper/index.ts [venueId]
 */

import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface Result {
  id: string;
  file: string;
  code: number | null;
}

/** Discover venue folders: immediate subfolders that contain a scrape.ts. */
async function discoverVenues(): Promise<string[]> {
  const entries = await readdir(HERE, { withFileTypes: true });
  const venues: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const scrapeFile = path.join(HERE, entry.name, "scrape.ts");
    try {
      await stat(scrapeFile);
    } catch {
      continue; // folder exists but has no scrape.ts entry — skip it.
    }
    venues.push(entry.name);
  }
  return venues.sort();
}

/** Run one venue scraper as a child process. */
function runVenue(id: string): Promise<Result> {
  const file = path.join(HERE, id, "scrape.ts");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], {
      cwd: HERE,
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", (err) => {
      console.error(`[${id}] failed to start: ${err.message}`);
      resolve({ id, file, code: -1 });
    });
    child.on("close", (code) => resolve({ id, file, code }));
  });
}

/**
 * Regenerate the client-facing artifacts (baked venue metadata + program
 * shards) from the freshly scraped out/scraped-data JSON.
 */
function buildClientData(): Promise<number | null> {
  const file = path.join(HERE, "build-client-data.ts");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], {
      cwd: HERE,
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", (err) => {
      console.error(`[build-client-data] failed to start: ${err.message}`);
      resolve(-1);
    });
    child.on("close", (code) => resolve(code));
  });
}

/**
 * Validate venue amenity metadata against the predefined keys before scraping,
 * so malformed data never reaches the committed artifacts.
 */
function validateMeta(): Promise<number | null> {
  const file = path.join(HERE, "validate-meta.ts");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], {
      cwd: HERE,
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", (err) => {
      console.error(`[validate-meta] failed to start: ${err.message}`);
      resolve(-1);
    });
    child.on("close", (code) => resolve(code));
  });
}

async function main(): Promise<void> {
  const validateCode = await validateMeta();
  if (validateCode !== 0) {
    console.error("[validate-meta] failed; aborting scrape.");
    process.exitCode = 1;
    return;
  }

  const want = process.argv[2];
  let venues = await discoverVenues();
  if (want) {
    const filtered = venues.filter((a) => a.includes(want));
    if (filtered.length === 0) {
      console.error(`No scraper matches "${want}". Known: ${venues.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    venues = filtered;
  }

  const results: Result[] = [];
  for (const id of venues) {
    results.push(await runVenue(id));
  }

  const failures = results.filter((r) => r.code !== 0);
  for (const r of results) {
    const ok = r.code === 0 ? "ok" : `failed (${r.code})`;
    console.log(`[${r.id}] ${ok}`);
  }

  const buildCode = await buildClientData();
  if (buildCode !== 0) {
    console.error(`[build-client-data] failed (${buildCode}).`);
    process.exitCode = 1;
  }

  if (failures.length > 0) {
    console.error(`Scraped ${results.length} venue(s); ${failures.length} failed.`);
    process.exitCode = 1;
  } else {
    console.log(`Done. Scraped ${results.length} venue(s).`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});