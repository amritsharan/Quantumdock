
import { initializeApp, getApps, getApp, type App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// This is a server-only file. It should not be imported into client components.

// IMPORTANT: Burn after reading. The service account key is sensitive and should be
// handled with extreme care.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccount) {
    throw new Error('The Firebase service account key is not set in the environment variables.');
}

const parsedServiceAccount = JSON.parse(serviceAccount);

/**
 * Initializes and returns the Firebase Admin App instance.
 * Ensures that initialization only happens once.
 */
export async function initServerApp(): Promise<App> {
  if (getApps().length) {
    return getApp();
  }

  const app = initializeApp({
    credential: credential.cert(parsedServiceAccount),
    // Optionally add the databaseURL if you use Realtime Database
    // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
  });

  return app;
}
