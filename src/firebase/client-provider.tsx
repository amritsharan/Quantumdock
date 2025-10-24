
'use client';

import { FirebaseProvider } from '@/firebase/provider';
import type { ReactNode } from 'react';

/**
 * This provider ensures that the Firebase context, which includes the auth state
 * and the crucial error listener, is only initialized and rendered on the client side.
 * This is the correct pattern for using client-side Firebase services in the Next.js App Router.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // By rendering the FirebaseProvider inside this client component, we ensure
  // that all its children (which depend on client-side auth state) are also
  // treated as client components, preventing mismatches during server rendering.
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
