'use client';

import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const router = useRouter();

  const signUpWithGoogle = async () => {
    if (!signUp) return;
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (error) {
      console.error('Error signing up with Google:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md bg-transparent border-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>to get started with QuantumDock</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signUpWithGoogle} className="w-full">
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
