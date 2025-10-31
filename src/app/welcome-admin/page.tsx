
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

export default function WelcomeAdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth is still loading, do nothing.
    if (isUserLoading) {
      return;
    }
    
    // If no user is logged in, or the user is not the admin, redirect away.
    if (!user || user.email !== 'amritsr2005@gmail.com') {
      router.replace('/sign-in');
    }
  }, [user, isUserLoading, router]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <QuantumDockLogo className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold">Welcome, Admin!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            You have successfully signed in as an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>You now have access to all administrative features, including user management and system monitoring.</p>
          <Button onClick={handleContinue} size="lg">
            Proceed to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
