
'use client';
import { useState, useEffect, useRef } from 'react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, serverTimestamp, limit, orderBy, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
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
            const userDocRef = doc(firestore, 'users', user.uid);
            
            // 1. Create user document if it doesn't exist
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                setDocumentNonBlocking(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    createdAt: serverTimestamp(),
                }, { merge: true });
            }

            // 2. Deactivate any previously active sessions
            const historyQuery = query(
              collection(firestore, "users", user.uid, "loginHistory"),
              where("status", "==", "active"),
              orderBy("loginTime", "desc")
            );
        
            const querySnapshot = await getDocs(historyQuery);
            for (const docSnapshot of querySnapshot.docs) {
              updateDocumentNonBlocking(docSnapshot.ref, {
                  status: 'inactive',
                  logoutTime: serverTimestamp() // Mark it as logged out now
              });
            }

            // 3. Create the new active session
            addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'loginHistory'), {
              userId: user.uid,
              loginTime: serverTimestamp(),
              status: 'active',
            });
        };

        handleNewLogin().catch(console.error);
    }
  }, [user, firestore, isUserLoading]);


  const handleSignOut = async () => {
    if (!user || !firestore) {
        if (auth) await signOut(auth); // Sign out if service available, even if firestore is not
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
        const activeSessionDoc = querySnapshot.docs[0];
        const loginTimeData = activeSessionDoc.data().loginTime as Timestamp | undefined;
        
        let duration = 0;
        if (loginTimeData && typeof loginTimeData.toDate === 'function') {
            const loginTime = loginTimeData.toDate();
            const logoutTime = new Date();
            const calculatedDuration = Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)); // in minutes
            duration = calculatedDuration > 0 ? calculatedDuration : 0;
        }
        
        const updateData = {
          status: 'inactive',
          logoutTime: serverTimestamp(),
          duration: duration,
        };

        // Use a standard, awaited updateDoc call here inside a try/catch
        // to ensure the session update completes before signing out.
        await updateDoc(activeSessionDoc.ref, updateData);
      }
    } catch (error: any) {
        console.error('Error querying or updating login history on sign out:', error);
        // We will show an error but still proceed to sign out the user.
        setSignOutError(error.message || 'An unknown error occurred while updating your session.');
        setShowSignOutError(true);
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
      console.error('Error signing out: ', error);
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
