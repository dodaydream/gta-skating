import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  doc,
  initializeFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

// Load NEXT_PUBLIC_FIREBASE_* from .env.local so the script needs no extra setup.
function loadEnvLocal() {
  try {
    const path = fileURLToPath(new URL("../.env.local", import.meta.url));
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env.local is optional; env vars may be supplied by the shell instead.
  }
}

loadEnvLocal();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Missing Firebase config. Set NEXT_PUBLIC_FIREBASE_* in .env.local.");
  process.exit(1);
}

const slug = process.argv[2] ?? "test-arena-dev";
const count = Number(process.argv[3] ?? 3);
const timezone = process.argv[4] ?? "America/Toronto";
const busyFor = (i) => (i % 3) + 1; // 1, 2, 3, 1, ...

// Venue-local YYYYMMDDHH, matching the app's doc-ID scheme.
function venueHour(tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}`;
}

async function main() {
  const hour = venueHour(timezone);
  console.log(`Seeding ${count} report(s) for "${slug}" (hour ${hour}, ${timezone})`);

  for (let i = 0; i < count; i++) {
    // A fresh app instance per report yields a distinct anonymous uid, so the
    // writes are not deduplicated by the {venueSlug}_{uid}_{hour} doc ID.
    const app = initializeApp(firebaseConfig, `seed-${i}-${Date.now()}`);

    try {
      const auth = getAuth(app);
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;

      // Long polling avoids WebChannel streaming quirks when run under Node.
      const db = initializeFirestore(app, { experimentalForceLongPolling: true });

      const busy = busyFor(i);
      const id = `${slug}_${uid}_${hour}`;
      await setDoc(doc(db, "busyReports", id), {
        venueSlug: slug,
        busy,
        uid,
        reportedAt: serverTimestamp(),
      });

      console.log(`  wrote ${id} (busy=${busy})`);
    } finally {
      await deleteApp(app);
    }
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
