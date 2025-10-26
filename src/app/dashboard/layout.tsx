
'use client';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { History } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const handleSignOut = async () => {
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const loginEvents = userDoc.data().loginEvents || [];
          const lastLoginEventIndex = loginEvents.findLastIndex((event: any) => !event.logoutTime);

          if (lastLoginEventIndex !== -1) {
            const updatedEvents = [...loginEvents];
            updatedEvents[lastLoginEventIndex] = {
              ...updatedEvents[lastLoginEventIndex],
              logoutTime: new Date(), // Use client-side timestamp
            };
            await updateDoc(userRef, { loginEvents: updatedEvents });
          }
        }
      } catch (error) {
        console.error("Error updating logout time:", error);
      }
    }
    await signOut(auth);
    router.push('/sign-in');
  }

  const getInitials = (email?: string | null) => {
    return email ? email.substring(0, 2).toUpperCase() : '??';
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
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
                  <DropdownMenuItem asChild>
                     <Link href="/dashboard/history">
                        <History className="mr-2 h-4 w-4" />
                        <span>Login History</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/sign-in')} variant="outline">
                Sign In
              </Button>
            )}
        </div>
      </header>
      {children}
    </div>
  );
}
