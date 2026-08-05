import admin from 'firebase-admin';
import { env } from './env';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.warn('⚠️ Firebase initialization warning (using dev fallback):', err);
    // Initialize without cert for local offline mode if needed
    admin.initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }
}

export const db = admin.firestore();
export default admin;
