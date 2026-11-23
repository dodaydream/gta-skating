/**
 * One-time seed for the busyness aggregates:
 *   - rebuilds `busyAggregates/{venueId}` from every existing report, and
 *   - sets the aggregation watermark in `busyAggregateState/meta` so the
 *     scheduled Cloud Function only processes reports created afterwards.
 *
 * Run after deploying the aggregate rules and before switching the client over.
 *
 * Buckets mirror the Cloud Function: keyed by (programType, day-of-week,
 * minute-of-day) taken from the report's venue-local `programStartAt`; legacy
 * reports without it fall back to the report instant in America/Toronto.
 *
 * Credentials (project + service account) come from the environment:
 *   - FIREBASE_PROJECT_ID   (falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON, or
 *   - FIREBASE_SERVICE_ACCOUNT        the service-account JSON itself
 *
 * Dry-run by default; pass --apply to write. Run with:
 *   node --env-file=.env.local scripts/backfill-busy-aggregates.mjs
 *   node --env-file=.env.local scripts/backfill-busy-aggregates.mjs --apply
 */

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { slotFromInstant, slotFromStart } from "../src/lib/feedback.ts";

const LEGACY_PROGRAM_TYPE = "Public Skate";
const FALLBACK_TIMEZONE = "America/Toronto";
const PAGE = 500;
const BATCH = 450;

function initApp() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
  return initializeApp({ credential, projectId });
}

/** Bucket key for a report document, mirroring the Cloud Function. */
function bucketKeyFor(data) {
  const programType =
    typeof data.programType === "string" ? data.programType : LEGACY_PROGRAM_TYPE;
  let slot =
    typeof data.programStartAt === "string"
      ? slotFromStart(data.programStartAt)
      : null;
  if (!slot) {
    const at = data.reportedAt;
    const iso =
      at && typeof at.toDate === "function" ? at.toDate().toISOString() : null;
    if (!iso) return null;
    slot = slotFromInstant(iso, FALLBACK_TIMEZONE);
  }
  return { programType, dow: slot.dow, minute: slot.minute };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = getFirestore(initApp());
  const reports = db.collection("busyReports");

  // venueId -> Map<programType, Map<dow, Map<minute, { s, n }>>>
  const byVenue = new Map();
  let processed = 0;
  let watermarkMs = null;
  let last = null;

  for (;;) {
    let query = reports.orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (typeof data.venueId !== "string") continue;
      const key = bucketKeyFor(data);
      if (!key) continue;
      processed += 1;

      const at = data.reportedAt;
      if (at && typeof at.toMillis === "function") {
        const ms = at.toMillis();
        if (watermarkMs === null || ms > watermarkMs) watermarkMs = ms;
      }

      let buckets = byVenue.get(data.venueId);
      if (!buckets) {
        buckets = new Map();
        byVenue.set(data.venueId, buckets);
      }
      let byDay = buckets.get(key.programType);
      if (!byDay) {
        byDay = new Map();
        buckets.set(key.programType, byDay);
      }
      let day = byDay.get(key.dow);
      if (!day) {
        day = new Map();
        byDay.set(key.dow, day);
      }
      const cell = day.get(key.minute) ?? { s: 0, n: 0 };
      cell.s += Number(data.busy) || 0;
      cell.n += 1;
      day.set(key.minute, cell);
    }

    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }

  // Flatten nested Maps into plain objects for Firestore.
  const docs = [];
  for (const [venueId, buckets] of byVenue) {
    const out = {};
    for (const [programType, byDay] of buckets) {
      const days = {};
      for (const [dow, day] of byDay) {
        const minutes = {};
        for (const [minute, cell] of day) minutes[String(minute)] = cell;
        days[String(dow)] = minutes;
      }
      out[programType] = days;
    }
    docs.push({ venueId, buckets: out });
  }

  console.log(
    `${processed} report(s) across ${docs.length} venue(s). ` +
      `Watermark: ${watermarkMs === null ? "none" : new Date(watermarkMs).toISOString()}.`
  );

  if (!apply) {
    console.log("[dry-run] Re-run with --apply to write aggregates.");
    return;
  }

  // Overwrite aggregates so re-runs stay idempotent.
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = db.batch();
    for (const { venueId, buckets } of docs.slice(i, i + BATCH)) {
      batch.set(db.collection("busyAggregates").doc(venueId), {
        buckets,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`Wrote ${Math.min(i + BATCH, docs.length)}/${docs.length} aggregate(s)`);
  }

  await db
    .collection("busyAggregateState")
    .doc("meta")
    .set(
      {
        watermark:
          watermarkMs === null ? null : Timestamp.fromMillis(watermarkMs),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
