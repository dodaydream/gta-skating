import {
  type BusyAggregate,
  type BusyAggregateBuckets,
  type BusyLevel,
} from "@/types/feedback";
import type { ProgramType } from "@/types/schedule";
import {
  ensureAnonymousAuth,
  getFirebaseApp,
  isFirebaseConfigured,
} from "@/lib/firebase";

const COLLECTION = "busyReports";
const AGGREGATE_COLLECTION = "busyAggregates";

/**
 * Load the pre-aggregated busyness for a venue. The scheduled Cloud Function
 * maintains one `busyAggregates/{venueId}` document, so a modal open costs a
 * single read instead of scanning every report. Returns `null` when no
 * aggregate exists yet (no reports, or the function has not run).
 */
export async function loadVenueAggregate(
  venueId: string
): Promise<BusyAggregate | null> {
  if (!isFirebaseConfigured()) return null;

  const app = await getFirebaseApp();
  const { getFirestore, doc, getDoc } = await import("firebase/firestore");
  const db = getFirestore(app);
  const snapshot = await getDoc(doc(db, AGGREGATE_COLLECTION, venueId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const updatedAt = data.updatedAt as { toDate?: () => Date } | undefined;
  return {
    buckets: (data.buckets as BusyAggregateBuckets | undefined) ?? {},
    updatedAt:
      updatedAt && typeof updatedAt.toDate === "function"
        ? updatedAt.toDate().toISOString()
        : undefined,
  };
}

export interface ReportKey {
  venueId: string;
  programType: ProgramType;
  /** Venue-local program window, "YYYY-MM-DDTHH:mm" (matches Program.start/end). */
  programStartAt: string;
  programEndsAt: string;
}

export interface SubmitReportInput extends ReportKey {
  busy: BusyLevel;
}

/** Lowercase hex SHA-256 of the input; used as a deterministic document id. */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/** Deterministic report id: one document per (reporter, program). */
function reportId(uid: string, key: ReportKey): Promise<string> {
  return sha256Hex(
    [uid, key.venueId, key.programType, key.programStartAt, key.programEndsAt].join(
      "|"
    )
  );
}

/** Whether the signed-in (anonymous) reporter has already rated this program. */
export async function hasReported(key: ReportKey): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const auth = await ensureAnonymousAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return false;

  const app = await getFirebaseApp();
  const { getFirestore, doc, getDoc } = await import("firebase/firestore");
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, COLLECTION, await reportId(uid, key)));
  return snap.exists();
}

/**
 * Write a single busyness observation for a program. Signs in anonymously on
 * first use. The document id hashes the reporter and the program, so a reporter
 * can submit at most one report per program: a repeat collides with the existing
 * document, which the rules reject by forbidding updates.
 */
export async function submitReport({
  venueId,
  busy,
  programType,
  programStartAt,
  programEndsAt,
}: SubmitReportInput): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }

  const auth = await ensureAnonymousAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Anonymous sign-in failed");
  }

  const app = await getFirebaseApp();
  const { getFirestore, doc, setDoc, serverTimestamp } = await import(
    "firebase/firestore"
  );

  const db = getFirestore(app);
  const id = await reportId(uid, {
    venueId,
    programType,
    programStartAt,
    programEndsAt,
  });

  await setDoc(doc(db, COLLECTION, id), {
    venueId,
    busy,
    programType,
    programStartAt,
    programEndsAt,
    uid,
    reportedAt: serverTimestamp(),
  });
}
