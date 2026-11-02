import type { BusyLevel, BusyReport } from "@/types/feedback";
import {
  ensureAnonymousAuth,
  getFirebaseApp,
  isFirebaseConfigured,
} from "@/lib/firebase";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const COLLECTION = "busyReports";

/**
 * Load every busyness report for a venue. Reads go straight to Firestore,
 * scoped to the venue slug; sorting is done client-side to avoid needing a
 * composite index.
 */
export async function loadVenueReports(
  venueSlug: string
): Promise<BusyReport[]> {
  if (!isFirebaseConfigured()) return [];

  const app = await getFirebaseApp();
  const { getFirestore, collection, query, where, getDocs } = await import(
    "firebase/firestore"
  );

  const db = getFirestore(app);
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("venueSlug", "==", venueSlug))
  );

  const reports: BusyReport[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const reportedAt = data.reportedAt as { toDate?: () => Date } | undefined;
    return {
      venueSlug: data.venueSlug as string,
      reportedAt:
        reportedAt && typeof reportedAt.toDate === "function"
          ? reportedAt.toDate().toISOString()
          : new Date(0).toISOString(),
      busy: data.busy as BusyLevel,
      uid: data.uid as string | undefined,
    };
  });

  reports.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return reports;
}

/**
 * Write a single busyness observation for the current hour. Signs in
 * anonymously on first use; the doc ID caps a user to one report per venue per
 * hour (venue-local time).
 */
export async function submitReport(
  venueSlug: string,
  busy: BusyLevel,
  timezone: string
): Promise<void> {
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
  const hour = dayjs().tz(timezone).format("YYYYMMDDHH");
  const id = `${venueSlug}_${uid}_${hour}`;

  await setDoc(doc(db, COLLECTION, id), {
    venueSlug,
    busy,
    uid,
    reportedAt: serverTimestamp(),
  });
}
