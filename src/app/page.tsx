'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/sign-in');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
