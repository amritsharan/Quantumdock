
'use client';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';

type UserProfile = {
  isAdmin?: boolean;
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user && firestore) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      getDoc(userProfileRef).then(snapshot => {
        if (snapshot.exists()) {
          const profile = snapshot.data() as UserProfile;
          setIsAdmin(profile.isAdmin || false);
        }
      });
    }
  }, [user, firestore]);


  const handleSignOut = async () => {
    // Immediately sign out and redirect for a responsive UI
    if(auth) {
        await signOut(auth);
    }
    router.push('/sign-in');

    // Perform database operations in the background
    if (!auth || !user || !firestore) {
        return;
    };
    
    const userLoginHistoryRef = collection(firestore, 'users', user.uid, 'loginHistory');
    const activeSessionQuery = query(
      userLoginHistoryRef, 
      where('logoutTime', '==', null),
      orderBy('loginTime', 'desc'),
      limit(1)
    );
    
    getDocs(activeSessionQuery).then((snapshot) => {
      if (!snapshot.empty) {
        const lastLoginDoc = snapshot.docs[0];
        updateDoc(lastLoginDoc.ref, { logoutTime: Date.now() });
      }
    }).catch(error => {
      console.error("Error updating logout time:", error);
    });
  }

  const getInitials = (email?: string | null) => {
    return email ? email.substring(0, 2).toUpperCase() : '??';
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <Link href="/dashboard" className="text-2xl font-semibold text-foreground">QuantumDock</Link>
        </div>
        <div className="flex items-center gap-4">
            {isUserLoading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : user ? (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL ?? undefined} alt={user.email ?? ''} />
                      <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">My Account</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/dashboard/history')}>
                      <History className="mr-2 h-4 w-4" />
                      <span>Login History</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/sin-in')} variant="outline">
                Sign In
              </Button>
            )}
        </div>
      </header>
      {children}
    </div>
  );
}
