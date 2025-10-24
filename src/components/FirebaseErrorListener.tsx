
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * A client-side component that listens for globally emitted Firestore permission errors
 * and throws them. This is designed to be caught by Next.js's development error overlay,
 * providing a rich debugging experience for security rule violations.
 *
 * This component should be placed within a client-side boundary (e.g., a provider).
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In development, we throw the error to leverage the Next.js error overlay.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      } else {
        // In production, you might want to log this to a service like Sentry or Google Cloud Logging.
        console.error('Firestore Permission Error:', error.message);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything.
}
