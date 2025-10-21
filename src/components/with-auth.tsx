
'use client';

import { useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { Skeleton } from './ui/skeleton';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function WithAuth(props: P) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/login');
      }
    }, [user, loading, router]);

    if (loading) {
       return (
        <div className="flex min-h-screen w-full flex-col">
            <div className="flex h-16 items-center justify-between border-b px-4 md:px-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                 <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
                    <div className="grid auto-rows-max items-start gap-6">
                        <Skeleton className="h-96 w-full" />
                    </div>
                     <div className="grid auto-rows-max items-start gap-6">
                        <Skeleton className="h-[600px] w-full" />
                     </div>
                </div>
            </main>
        </div>
       )
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}
