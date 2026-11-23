import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { bucketKeyFor } from "./buckets";

initializeApp();
const db = getFirestore();

/**
 * Pin to the Firestore location to avoid cross-region read latency/egress. The
 * `gta-skating` database is `nam5` (US multi-region), served from us-central1.
 */
const REGION = "us-central1";

const AGGREGATE_COLLECTION = "busyAggregates";
const STATE_COLLECTION = "busyAggregateState";
const REPORT_COLLECTION = "busyReports";
const STATE_DOC = "meta";

const PAGE = 500;
/** Bound each run so it never overlaps the next 15-minute invocation. */
const MAX_PAGES = 50;

/**
 * Incremental aggregator: reads reports newer than the stored watermark, folds
 * them into per-venue `busyAggregates` documents with `FieldValue.increment`,
 * and advances the watermark in the same batch (so a crash reprocesses rather
 * than double-counts).
 */
export const aggregateBusyness = onSchedule(
  {
    schedule: "every 15 minutes",
    region: REGION,
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    const stateRef = db.collection(STATE_COLLECTION).doc(STATE_DOC);
    const state = await stateRef.get();
    const value = state.get("watermark");
    let watermark: Timestamp | null = value instanceof Timestamp ? value : null;

    let processed = 0;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      let query = db
        .collection(REPORT_COLLECTION)
        .orderBy("reportedAt")
        .limit(PAGE);
      if (watermark) query = query.startAfter(watermark);

      const snap = await query.get();
      if (snap.empty) break;

      const batch = db.batch();
      let last: Timestamp | null = watermark;

      for (const doc of snap.docs) {
        const data = doc.data();
        const venueId = data.venueId;
        const key = bucketKeyFor(data);
        if (typeof venueId === "string" && key) {
          const base = `buckets.${key.programType}.${key.slot.dow}.${key.slot.minute}`;
          const ref = db.collection(AGGREGATE_COLLECTION).doc(venueId);
          batch.set(
            ref,
            {
              [`${base}.s`]: FieldValue.increment(Number(data.busy) || 0),
              [`${base}.n`]: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        if (data.reportedAt instanceof Timestamp) last = data.reportedAt;
      }

      batch.set(
        stateRef,
        { watermark: last, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      await batch.commit();

      processed += snap.size;
      watermark = last;
      if (snap.size < PAGE) break;
    }

    logger.info(`Aggregated ${processed} new busyness report(s)`);
  }
);
