import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let appPromise: Promise<FirebaseApp> | null = null;

/**
 * Lazily initialize the Firebase app. The `firebase/app` import is kept inside
 * the function so the SDK is never pulled into the initial client bundle.
 */
export function getFirebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = import("firebase/app").then(({ getApps, initializeApp }) => {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured");
      }
      const existing = getApps();
      return existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
    });
    appPromise = appPromise.catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

let authPromise: Promise<Auth> | null = null;

/**
 * Resolve an anonymous Firebase Auth session, signing in on first use. Cached
 * for the lifetime of the page so repeated writes reuse the same `uid`.
 */
export function ensureAnonymousAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const app = await getFirebaseApp();
      const { getAuth, signInAnonymously } = await import("firebase/auth");
      const auth = getAuth(app);
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      return auth;
    })();
    authPromise = authPromise.catch((error) => {
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}
