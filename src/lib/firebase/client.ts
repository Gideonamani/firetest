import {initializeApp, getApps, FirebaseApp} from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
} from "firebase/firestore";
import {getStorage, connectStorageEmulator} from "firebase/storage";
import {getFunctions, connectFunctionsEmulator} from "firebase/functions";

type FirebaseClients = {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
  storage: ReturnType<typeof getStorage>;
  functions: ReturnType<typeof getFunctions>;
};

let firebaseClients: FirebaseClients | null = null;
let emulatorsConfigured = false;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const emulatorHost =
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";

function getPort(name: string, fallback: string): number {
  const envKey = `NEXT_PUBLIC_FIREBASE_${name}_PORT`;
  const value = process.env[envKey as keyof NodeJS.ProcessEnv];
  const numeric = value ? Number(value) : undefined;
  return Number.isFinite(numeric) ? Number(numeric) : Number(fallback);
}

function ensureClients(): FirebaseClients {
  if (firebaseClients) {
    return firebaseClients;
  }

  const existingApps = getApps();
  const app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig);

  // Use initializeFirestore with experimental long polling only for the first initialization.
  const firestore = existingApps.length
    ? getFirestore(app)
    : initializeFirestore(app, {
      experimentalForceLongPolling:
        process.env.NEXT_PUBLIC_FIREBASE_FORCE_LONG_POLLING === "true",
    });

  const auth = getAuth(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);

  firebaseClients = {app, auth, firestore, storage, functions};
  return firebaseClients;
}

function maybeConnectEmulators(clients: FirebaseClients) {
  if (emulatorsConfigured) return;

  const shouldUseEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

  if (!shouldUseEmulators) {
    emulatorsConfigured = true;
    return;
  }

  // Only run this in the browser; Next.js server components should talk to production.
  if (typeof window === "undefined") {
    return;
  }

  connectAuthEmulator(
    clients.auth,
    `http://${emulatorHost}:${getPort("AUTH", "9099")}`,
    {disableWarnings: true},
  );
  connectFirestoreEmulator(
    clients.firestore,
    emulatorHost,
    getPort("FIRESTORE", "8080"),
  );
  connectStorageEmulator(
    clients.storage,
    emulatorHost,
    getPort("STORAGE", "9199"),
  );
  connectFunctionsEmulator(
    clients.functions,
    emulatorHost,
    getPort("FUNCTIONS", "5001"),
  );

  emulatorsConfigured = true;
}

export function getFirebaseClients(): FirebaseClients {
  const clients = ensureClients();

  if (typeof window !== "undefined") {
    setPersistence(clients.auth, browserLocalPersistence).catch(() => {
      // Fallback to default persistence if IndexedDB is not available (e.g., private browsing).
    });
  }

  maybeConnectEmulators(clients);

  return clients;
}

export type {FirebaseClients};
