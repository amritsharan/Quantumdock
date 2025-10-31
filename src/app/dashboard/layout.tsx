'use client';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut, User } from 'firebase/auth';
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

  const handleSignOut = async () => {
    if (!user || !auth || !firestore) {
        if (auth) {
            await signOut(auth);
        }
        router.push('/sign-in');
        return;
    }
  
    try {
      // Find the most recent active session to update it
      const historyQuery = query(
        collection(firestore, 'users', user.uid, 'loginHistory'),
        where('status', '==', 'active'),
        orderBy('loginTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(historyQuery);
      if (!querySnapshot.empty) {
        const activeSessionDoc = querySnapshot.docs[0];
        const loginTimeData = activeSessionDoc.data().loginTime;
        // Ensure loginTimeData is not null and has a toDate method
        const loginTime = loginTimeData?.toDate ? loginTimeData.toDate() : null;
        
        const logoutTime = new Date();
        const duration = loginTime ? Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)) : 0;
        
        await updateDoc(activeSessionDoc.ref, {
          status: 'inactive',
          logoutTime: serverTimestamp(),
          duration: duration,
        });
      }
    } catch (error) {
      console.error('Error updating login history on sign out:', error);
      // Non-blocking: Do not prevent sign-out if history fails to update
    }

    try {
      await signOut(auth);
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
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer">
                    <AvatarImage src={user.photoURL ?? ''} alt="User avatar" />
                    <AvatarFallback>
                      {user.email ? user.email.charAt(0).toUpperCase() : '?'}
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
            ) : (
              <Button asChild variant="outline">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            ))}
        </div>
      </header>
      {children}
    </div>
  );
}
