import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    const databaseId = firebaseConfig.firestoreDatabaseId;

    try {
      db = initializeFirestore(
        firebaseApp,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        databaseId
      );
    } catch {
      // If already initialized, get instance
      db = getFirestore(firebaseApp, databaseId);
    }
  }
  return db;
}

export { firebaseConfig };
