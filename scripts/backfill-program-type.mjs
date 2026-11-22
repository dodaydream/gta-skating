/**
 * TEMPORARY backfill for busyReports:
 *   - set `programType` on documents written before the field existed
 *     (ProgramType.Public Skate), and
 *   - replace the legacy `venueSlug` field with the venue uuid `venueId`,
 *     resolved from src/data/generated/venue-meta.json.
 *
 * Credentials (project + service account) come from the environment:
 *   - FIREBASE_PROJECT_ID   (falls back to NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON, or
 *   - FIREBASE_SERVICE_ACCOUNT        the service-account JSON itself
 *
 * Dry-run by default; pass --apply to write. Run with:
 *   node --env-file=.env.local scripts/backfill-program-type.mjs
 *   node --env-file=.env.local scripts/backfill-program-type.mjs --apply
 *
 * Delete this file once the backfill is done.
 */

import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const TYPE = "Public Skate"; // ProgramType.PublicSkate
const PAGE = 500;
const BATCH = 450;
const META = new URL("../src/data/generated/venue-meta.json", import.meta.url);

/** Must match src/lib/slug.ts. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** venue slug -> venue uuid, from the baked metadata. */
function loadSlugToId() {
  const { venues } = JSON.parse(readFileSync(META, "utf8"));
  return new Map(venues.map((venue) => [slugify(venue.name), venue.id]));
}

function initApp() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
  return initializeApp({ credential, projectId });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const slugToId = loadSlugToId();
  const db = getFirestore(initApp());
  const col = db.collection("busyReports");

  // Collect the docs that need migrating and the patch each needs.
  const patches = [];
  const unresolved = [];
  let last = null;
  for (;;) {
    let query = col.orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const data = doc.data();
      const patch = {};
      if (!("programType" in data)) patch.programType = TYPE;
      if ("venueSlug" in data) {
        const id = slugToId.get(data.venueSlug);
        if (id) {
          patch.venueId = id;
          patch.venueSlug = FieldValue.delete();
        } else if (!("venueId" in data)) {
          unresolved.push(data.venueSlug);
        }
      }
      if (Object.keys(patch).length > 0) patches.push({ ref: doc.ref, patch });
    }
    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }

  if (unresolved.length > 0) {
    console.warn(
      `Could not resolve ${unresolved.length} venue slug(s): ` +
        `${[...new Set(unresolved)].join(", ")}`
    );
  }
  if (patches.length === 0) {
    console.log("No legacy reports to migrate. Nothing to do.");
    return;
  }

  if (!apply) {
    console.log(`[dry-run] ${patches.length} report(s) would be migrated.`);
    console.log("Re-run with --apply to write.");
    return;
  }

  for (let i = 0; i < patches.length; i += BATCH) {
    const batch = db.batch();
    for (const { ref, patch } of patches.slice(i, i + BATCH)) {
      batch.update(ref, patch);
    }
    await batch.commit();
    console.log(`Updated ${Math.min(i + BATCH, patches.length)}/${patches.length}`);
  }
  console.log(`Done. Migrated ${patches.length} report(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
