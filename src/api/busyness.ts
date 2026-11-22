import {
  LEGACY_PROGRAM_TYPE,
  type BusyLevel,
  type BusyReport,
} from "@/types/feedback";
import type { ProgramType } from "@/types/schedule";
import {
  ensureAnonymousAuth,
  getFirebaseApp,
  isFirebaseConfigured,
} from "@/lib/firebase";

const COLLECTION = "busyReports";

/**
 * Load every busyness report for a venue. Reads go straight to Firestore,
 * scoped to the venue id; sorting is done client-side to avoid needing a
 * composite index.
 */
export async function loadVenueReports(
  venueId: string
): Promise<BusyReport[]> {
  if (!isFirebaseConfigured()) return [];

  const app = await getFirebaseApp();
  const { getFirestore, collection, query, where, getDocs } = await import(
    "firebase/firestore"
  );

  const db = getFirestore(app);
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("venueId", "==", venueId))
  );

  const reports: BusyReport[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const reportedAt = data.reportedAt as { toDate?: () => Date } | undefined;
    return {
      venueId: data.venueId as string,
      reportedAt:
        reportedAt && typeof reportedAt.toDate === "function"
          ? reportedAt.toDate().toISOString()
          : new Date(0).toISOString(),
      busy: data.busy as BusyLevel,
      uid: data.uid as string | undefined,
      // Reports written before the field existed backfill to Public Skate.
      programType:
        (data.programType as ProgramType | undefined) ?? LEGACY_PROGRAM_TYPE,
      programStartAt: data.programStartAt as string | undefined,
      programEndsAt: data.programEndsAt as string | undefined,
    };
  });

  reports.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return reports;
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
