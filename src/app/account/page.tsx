
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import app from '@/firebase/config';
import { withAuth } from '@/components/with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

function AccountPage() {
  const { user, loading: authLoading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        // If there's no user and auth is done loading, we can stop.
        if (!authLoading) {
            setLoading(false);
        }
        return;
      }
      
      try {
        const db = getFirestore(app);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setProfile(userDocSnap.data() as UserProfile);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
          console.error("Error fetching user profile:", error);
      } finally {
          setLoading(false);
      }
    }

    // We only want to fetch the profile once the user object is available.
    if (!authLoading) {
        fetchProfile();
    }
  }, [user, authLoading]);

  // The page is loading if either auth is loading or the profile fetch is loading.
  const pageLoading = authLoading || loading;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
        </div>
        <Button asChild variant="outline">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Dashboard
            </Link>
        </Button>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>My Account</CardTitle>
            <CardDescription>View and manage your personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            {pageLoading ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input id="first-name" value={profile.firstName} readOnly />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input id="last-name" value={profile.lastName} readOnly />
                    </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile.email} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input id="phone-number" type="tel" value={profile.phoneNumber || 'Not provided'} readOnly />
                </div>
              </div>
            ) : (
              <p>Could not load profile information.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(AccountPage);
