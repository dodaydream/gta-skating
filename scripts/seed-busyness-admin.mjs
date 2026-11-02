import { readFileSync } from "node:fs";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Seed busyness reports with arbitrary (backdated) timestamps. Uses the Admin
// SDK so it bypasses security rules; intended for local testing only.
//
// Usage:
//   node scripts/seed-busyness-admin.mjs \
//     --key ./service-account.json \
//     --slug bill-bolton-arena \
//     --busy 3 --count 3 \
//     --at 2026-10-30T18:30 --timezone America/Toronto
//
// `--at` is a venue-local datetime (no timezone suffix); it is converted to the
// venue's timezone before being stored, matching the program window.

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

// Offset (ms) of `tz` at the given instant.
function offsetMs(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  );
  return asUTC - date.getTime();
}

// Convert a venue-local "YYYY-MM-DDTHH:mm" into the corresponding UTC Date.
function zonedToUtc(local, tz) {
  const asIfUtc = new Date(`${local}:00Z`);
  return new Date(asIfUtc.getTime() - offsetMs(asIfUtc, tz));
}

function venueHour(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const slug = args.slug;
  const timezone = args.timezone ?? "America/Toronto";
  const busy = Number(args.busy ?? 3);
  const count = Number(args.count ?? 3);
  const at = args.at;

  if (!keyPath) throw new Error("Missing --key <service-account.json>");
  if (!slug) throw new Error("Missing --slug <venue-slug>");
  if (!at) throw new Error('Missing --at "<YYYY-MM-DDTHH:mm>" (venue-local)');

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  const app = initializeApp(
    { credential: cert(serviceAccount) },
    `seed-${Date.now()}`
  );

  try {
    const db = getFirestore(app);
    const reportedAt = Timestamp.fromDate(zonedToUtc(at, timezone));
    const hour = venueHour(reportedAt.toDate(), timezone);

    console.log(
      `Seeding ${count} x busy=${busy} for "${slug}" at ${at} (${timezone}) -> ${reportedAt.toDate().toISOString()}`
    );

    for (let i = 0; i < count; i++) {
      const uid = `seed-${i}`;
      const id = `${slug}_${uid}_${hour}`;
      await db.collection("busyReports").doc(id).set({
        venueSlug: slug,
        busy,
        uid,
        reportedAt,
      });
      console.log(`  wrote ${id}`);
    }
    console.log("Done.");
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message ?? error);
  process.exit(1);
});
