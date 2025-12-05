
'use client';
import { useState, useEffect, useRef } from 'react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  useUpdateLoginHistory,
  useCreateLoginHistory,
} from '@/dataconnect/hooks';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const activeLoginHistoryIdRef = useRef<string | null>(null);

  const { mutate: createLoginHistory } = useCreateLoginHistory();
  const { mutate: updateLoginHistory } = useUpdateLoginHistory();

  useEffect(() => {
    if (user && firestore && !isUserLoading) {
      const handleNewLogin = async () => {
        if (!firestore || !user) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(
              userDocRef,
              {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (error: any) {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'write',
              requestResourceData: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
              },
            })
          );
        }

        // Check for an existing active session only once
        if (activeLoginHistoryIdRef.current === null) {
          const historyQuery = query(
            collection(firestore, 'users', user.uid, 'loginHistory'),
            where('status', '==', 'active'),
            orderBy('loginTime', 'desc'),
            limit(1)
          );

          const querySnapshot = await getDocs(historyQuery);
          if (querySnapshot.empty) {
            // No active session, create a new one
            createLoginHistory(
              { status: 'active' },
              {
                onSuccess: (data) => {
                  activeLoginHistoryIdRef.current = data.loginHistoryId;
                },
                onError: (error) => {
                  toast({
                    variant: 'destructive',
                    title: 'Session Error',
                    description: 'Could not create a new login session.',
                  });
                },
              }
            );
          } else {
            // Active session found, store its ID
            activeLoginHistoryIdRef.current = querySnapshot.docs[0].id;
          }
        }
      };

      handleNewLogin();
    }
  }, [user, firestore, isUserLoading, createLoginHistory, toast]);

  const handleSignOut = async () => {
    if (activeLoginHistoryIdRef.current) {
      updateLoginHistory({
        loginHistoryId: activeLoginHistoryIdRef.current,
        status: 'inactive',
      });
    }

    try {
      if (auth) {
        await signOut(auth);
      }
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
      activeLoginHistoryIdRef.current = null; // Reset on sign out
      router.push('/sign-in');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: 'An error occurred while signing out. Please try again.',
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <Link
            href="/dashboard"
            className="text-2xl font-semibold text-foreground"
          >
            QuantumDock
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isUserLoading ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage
                    src={user?.photoURL || undefined}
                    alt="User avatar"
                  />
                  <AvatarFallback>
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/history">Login History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {children}
      <Toaster />
    </div>
  );
}
