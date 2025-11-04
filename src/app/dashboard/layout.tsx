
'use client';
import { useState, useEffect, useRef } from 'react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, serverTimestamp, limit, orderBy, Timestamp, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/toaster';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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
  const [showSignOutError, setShowSignOutError] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const hasHandledLogin = useRef(false);

  useEffect(() => {
    if (user && firestore && !isUserLoading && !hasHandledLogin.current) {
        hasHandledLogin.current = true; // Mark as handled to prevent re-running
        
        const handleNewLogin = async () => {
            if (!firestore || !user) return;
            
            // 1. Create user document if it doesn't exist
            const userDocRef = doc(firestore, 'users', user.uid);
            try {
                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists()) {
                   await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        createdAt: serverTimestamp(),
                    }, { merge: true });
                }
            } catch (error: any) {
                 errorEmitter.emit(
                    'permission-error',
                    new FirestorePermissionError({
                      path: userDocRef.path,
                      operation: userDocRef ? 'update' : 'create',
                      requestResourceData: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                      }
                    })
                  )
            }

            // 2. Create the new active session
            try {
                const newSessionData = {
                  userId: user.uid,
                  loginTime: serverTimestamp(),
                  status: 'active',
                };
                const historyCollectionRef = collection(firestore, 'users', user.uid, 'loginHistory');
                await addDoc(historyCollectionRef, newSessionData);
            } catch (error: any) {
                 errorEmitter.emit(
                    'permission-error',
                    new FirestorePermissionError({
                      path: `users/${user.uid}/loginHistory`,
                      operation: 'create',
                      requestResourceData: { status: 'active' }
                    })
                  )
            }
        };

        handleNewLogin();
    }
  }, [user, firestore, isUserLoading]);


  const handleSignOut = async () => {
    if (!user || !firestore) {
        if (auth) await signOut(auth); 
        router.push('/sign-in');
        return;
    }
  
    try {
      const historyQuery = query(
        collection(firestore, 'users', user.uid, 'loginHistory'),
        where('status', '==', 'active'),
        orderBy('loginTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(historyQuery);
      if (!querySnapshot.empty) {
        const activeSessionDocRef = querySnapshot.docs[0].ref;
        const activeSessionData = querySnapshot.docs[0].data();
        const loginTimeData = activeSessionData.loginTime as Timestamp | undefined;
        
        let duration = 0;
        if (loginTimeData && typeof loginTimeData.toDate === 'function') {
            const loginTime = loginTimeData.toDate();
            const logoutTime = new Date();
            const calculatedDuration = Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60));
            duration = calculatedDuration > 0 ? calculatedDuration : 0;
        }
        
        const updateData = {
          status: 'inactive',
          logoutTime: serverTimestamp(),
          duration: duration,
        };
        
        await updateDoc(activeSessionDocRef, updateData);
      }
    } catch (error: any) {
        // Emit a contextual error instead of showing an alert
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: (error as any)?.path || `users/${user.uid}/loginHistory`,
            operation: 'update',
          })
        );
        // We will still proceed to sign the user out.
    }

    try {
      if (auth) {
        await signOut(auth);
      }
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
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
          <Link href="/dashboard" className="text-2xl font-semibold text-foreground">QuantumDock</Link>
        </div>
        <div className="flex items-center gap-4">
          {!isUserLoading &&
            (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer">
                    <AvatarImage src={user?.photoURL || undefined} alt="User avatar" />
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
                  <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </header>
      {children}
      <Toaster />

      <AlertDialog open={showSignOutError} onOpenChange={setShowSignOutError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Update Error</AlertDialogTitle>
            <AlertDialogDescription>
              Could not update your session history, but you will be signed out. This might be due to a permissions issue.
              <br /><br />
              <strong className='text-destructive'>Error details:</strong> {signOutError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSignOutError(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
