import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const config: FirebaseWebConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  };

  const requiredValues = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.storageBucket,
    config.messagingSenderId,
    config.appId,
  ];

  return requiredValues.every((value) => Boolean(value)) ? config : null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirestoreClient(): Firestore | null {
  if (firestoreDb) {
    return firestoreDb;
  }

  const config = getFirebaseWebConfig();
  if (!config) {
    return null;
  }

  firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
  firestoreDb = getFirestore(firebaseApp);
  return firestoreDb;
}
