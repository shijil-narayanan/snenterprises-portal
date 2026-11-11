import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

// For local testing only: point the app at the Firebase emulators instead of the live project.
//   VITE_AUTH_EMULATOR=http://127.0.0.1:9099   VITE_FIRESTORE_EMULATOR=127.0.0.1:8080
if (auth && import.meta.env.VITE_AUTH_EMULATOR) {
  connectAuthEmulator(auth, import.meta.env.VITE_AUTH_EMULATOR, { disableWarnings: true });
}
if (db && import.meta.env.VITE_FIRESTORE_EMULATOR) {
  const [host, port] = import.meta.env.VITE_FIRESTORE_EMULATOR.split(':');
  connectFirestoreEmulator(db, host, Number(port));
}
