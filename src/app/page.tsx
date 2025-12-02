
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // Wait until the authentication state is fully resolved.
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to the dashboard.
        router.replace('/dashboard');
      } else {
        // If no user is logged in, redirect to the sign-in page.
        router.replace('/sign-in');
      }
    }
  }, [user, isUserLoading, router]);

  // Always render a loading state on both server and client during the initial check
  // to prevent hydration errors and content flashes.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <QuantumDockLogo className="h-16 w-16 animate-pulse text-primary" />
      <p className="text-muted-foreground">Initializing QuantumDock...</p>
    </div>
  );
}
