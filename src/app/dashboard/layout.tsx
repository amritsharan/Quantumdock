'use client';
import { useState } from 'react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';
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


  const handleSignOut = async () => {
    // For the hardcoded user, we can't rely on the auth object,
    // but we can check if it's the hardcoded user case by checking for lack of a real user
    // while being on the dashboard. This is brittle. A better check would be needed in a real app.
    const userId = user ? user.uid : 'hardcoded-user-amrit';

    if (!firestore) {
        if (auth) await signOut(auth); // Sign out if service available, even if firestore is not
        router.push('/sign-in');
        return;
    }
  
    try {
      const historyQuery = query(
        collection(firestore, 'users', userId, 'loginHistory'),
        where('status', '==', 'active'),
        orderBy('loginTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(historyQuery);
      if (!querySnapshot.empty) {
        const activeSessionDoc = querySnapshot.docs[0];
        const loginTimeData = activeSessionDoc.data().loginTime;
        
        if (loginTimeData) {
            const loginTime = loginTimeData.toDate ? loginTimeData.toDate() : new Date(loginTimeData.seconds * 1000);
            const logoutTime = new Date();
            const duration = Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)); // in minutes
            
            await updateDoc(activeSessionDoc.ref, {
              status: 'inactive',
              logoutTime: serverTimestamp(),
              duration: duration > 0 ? duration : 0,
            });
        } else {
             await updateDoc(activeSessionDoc.ref, {
              status: 'inactive',
              logoutTime: serverTimestamp(),
              duration: 0,
            });
        }
      }
    } catch (error: any) {
        console.error('Error updating login history on sign out:', error);
        setSignOutError(error.message || 'An unknown error occurred while updating your session.');
        setShowSignOutError(true);
        return;
    }

    try {
      // Only call signOut if the user is not the hardcoded one
      if (user && auth) {
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
                    <AvatarImage src={user?.photoURL ?? ''} alt="User avatar" />
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
            <AlertDialogTitle>Sign-Out Error</AlertDialogTitle>
            <AlertDialogDescription>
              There was a problem updating your session history. Please try signing out again.
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
