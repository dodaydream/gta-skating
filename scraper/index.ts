/**
 * Driver that runs every per-arena scraper found under ./scraper (each arena is
 * a sub-folder containing a scrape.ts entry that runs on import).
 *
 * Usage:  node scraper/index.ts [arenaId]
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

/** Discover arena folders: immediate subfolders that contain a scrape.ts. */
async function discoverArenas(): Promise<string[]> {
  const entries = await readdir(HERE, { withFileTypes: true });
  const arenas: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const scrapeFile = path.join(HERE, entry.name, "scrape.ts");
    try {
      await stat(scrapeFile);
    } catch {
      continue; // folder exists but has no scrape.ts entry — skip it.
    }
    arenas.push(entry.name);
  }
  return arenas.sort();
}

/** Run one arena scraper as a child process. */
function runArena(id: string): Promise<Result> {
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

async function main(): Promise<void> {
  const want = process.argv[2];
  let arenas = await discoverArenas();
  if (want) {
    const filtered = arenas.filter((a) => a.includes(want));
    if (filtered.length === 0) {
      console.error(`No scraper matches "${want}". Known: ${arenas.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    arenas = filtered;
  }

  const results: Result[] = [];
  for (const id of arenas) {
    results.push(await runArena(id));
  }

  const failures = results.filter((r) => r.code !== 0);
  for (const r of results) {
    const ok = r.code === 0 ? "ok" : `failed (${r.code})`;
    console.log(`[${r.id}] ${ok}`);
  }
  if (failures.length > 0) {
    console.error(`Scraped ${results.length} arena(s); ${failures.length} failed.`);
    process.exitCode = 1;
  } else {
    console.log(`Done. Scraped ${results.length} arena(s).`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});