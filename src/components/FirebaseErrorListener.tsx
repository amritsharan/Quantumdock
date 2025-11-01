
'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It displays the error in a popup dialog instead of throwing it.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  const handleClose = () => {
    setError(null);
  };

  if (!error) {
    return null;
  }

  return (
    <AlertDialog open={!!error} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Firebase Permission Error
          </AlertDialogTitle>
          <AlertDialogDescription>
            The application tried to perform an action that was denied by your
            Firestore Security Rules.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-4 bg-muted p-4 rounded-md text-xs overflow-auto max-h-[50vh]">
            <pre className="whitespace-pre-wrap break-all">{error.message}</pre>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
