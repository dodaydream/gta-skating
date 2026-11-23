/**
 * Seed a single busyness aggregate bucket directly, bypassing security rules
 * via the Admin SDK (the client cannot write `busyAggregates`).
 *
 * Each bucket is `buckets.<programType>.<dayOfWeek>.<minuteOfDay> = { s, n }`
 * where dayOfWeek is venue-local (0 = Sunday) and minuteOfDay is the minute-of-
 * day of the program start. The client matches a program by its `type`, the
 * start day-of-week, and the window [startMinute, endMinute).
 *
 * Credentials (project + service account) come from the environment:
 *   - FIREBASE_PROJECT_ID   (falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON, or
 *   - FIREBASE_SERVICE_ACCOUNT        the service-account JSON itself
 *
 * Dry-run by default; pass --apply to write. Examples:
 *   node --env-file=.env.local scripts/seed-busy-aggregate.mjs \
 *     --venue bill-bolton-arena --type "Public Skate" --dow 5 --time 17:40 \
 *     --s 9 --n 3 --apply
 *   node --env-file=.env.local scripts/seed-busy-aggregate.mjs \
 *     --venue bill-bolton-arena --type "Public Skate" --date 2026-11-27 \
 *     --time 17:40 --s 9 --n 3
 */

import { readFileSync } from "node:fs";
import { slugify } from "../src/lib/slug.ts";

const META = new URL("../src/data/generated/venue-meta.json", import.meta.url);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parse `--flag value` pairs; `--apply` is a boolean. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--apply") {
      args.apply = true;
    } else if (token.startsWith("--")) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function fail(message) {
  console.error(message);
  console.error(
    "Usage: --venue <id|slug|name> --type <programType> " +
      "(--dow <0-6> | --date YYYY-MM-DD) [--time HH:mm | --minute <n>] " +
      "--s <sum> --n <count> [--apply]"
  );
  process.exit(1);
}

/** Venue id from a uuid, slug, or exact (case-insensitive) name. */
function resolveVenueId(input) {
  const { venues } = JSON.parse(readFileSync(META, "utf8"));
  if (venues.some((venue) => venue.id === input)) return input;
  const slug = slugify(input);
  const bySlug = venues.find((venue) => slugify(venue.name) === slug);
  if (bySlug) return bySlug.id;
  const byName = venues.find(
    (venue) => venue.name.toLowerCase() === input.toLowerCase()
  );
  return byName ? byName.id : null;
}

/** Day-of-week (venue-local, 0 = Sunday) from a "YYYY-MM-DD" date. */
function dowFromDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) fail(`Invalid --date: ${date} (expected YYYY-MM-DD)`);
  const [, year, month, day] = match;
  return new Date(Date.UTC(+year, +month - 1, +day)).getUTCDay();
}

function minuteFromTime(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) fail(`Invalid --time: ${time} (expected HH:mm)`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function initApp() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  // Imported lazily so a missing credential surfaces as a clear error.
  return import("firebase-admin/app").then(({ initializeApp, applicationDefault, cert }) => {
    const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
    return initializeApp({ credential, projectId });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const input = args.venue;
  const type = args.type;
  if (!input) fail("Missing --venue");
  if (!type) fail("Missing --type");
  if (args.s === undefined) fail("Missing --s");
  if (args.n === undefined) fail("Missing --n");

  if (!args.date && args.dow === undefined) {
    fail("Provide either --dow <0-6> or --date YYYY-MM-DD");
  }
  const dow = args.date
    ? dowFromDate(args.date)
    : Number(args.dow);
  if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
    fail(`Invalid --dow: ${args.dow} (expected 0-6)`);
  }

  const minute =
    args.minute !== undefined
      ? Number(args.minute)
      : args.time !== undefined
        ? minuteFromTime(args.time)
        : 0;
  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) {
    fail(`Invalid minute: must be 0-1439 (got ${minute})`);
  }

  const s = Number(args.s);
  const n = Number(args.n);
  if (!Number.isInteger(s) || s < 0) fail(`Invalid --s: ${args.s}`);
  if (!Number.isInteger(n) || n < 0) fail(`Invalid --n: ${args.n}`);

  const venueId = resolveVenueId(input);
  if (!venueId) fail(`Could not resolve venue: ${input}`);

  const hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
    minute % 60
  ).padStart(2, "0")}`;
  console.log(
    `Venue ${venueId} | ${type} | ${WEEKDAYS[dow]} (dow ${dow}) ${hhmm} ` +
      `(minute ${minute}) -> s=${s}, n=${n}`
  );

  if (!args.apply) {
    console.log("[dry-run] Re-run with --apply to write the aggregate.");
    return;
  }

  const app = await initApp();
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const db = getFirestore(app);

  // Deep-merge so sibling buckets are preserved.
  await db
    .collection("busyAggregates")
    .doc(venueId)
    .set(
      {
        buckets: { [type]: { [dow]: { [minute]: { s, n } } } },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  console.log(`Wrote busyAggregates/${venueId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
