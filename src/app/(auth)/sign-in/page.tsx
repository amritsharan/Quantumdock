
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useDatabase } from '@/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';
import { ref, get, set, push } from "firebase/database";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const db = useDatabase();
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccessfulLogin = (userCredential: UserCredential) => {
    const user = userCredential.user;
    
    // Immediately redirect to make the UI feel responsive
    router.push('/dashboard');
    
    if (user && db) {
      const userRef = ref(db, 'users/' + user.uid);
      const loginHistoryRef = ref(db, 'loginHistory/' + user.uid);

      // 1. Record the login event reliably
      push(loginHistoryRef, {
        loginTime: Date.now(),
        logoutTime: null,
      }).catch(error => {
          console.error("Error recording login event:", error);
      });

      // 2. Check for and create user profile if it doesn't exist. This is the single source of truth for profile creation.
      get(userRef).then((snapshot) => {
        if (!snapshot.exists()) {
          const isAdmin = user.email === 'amritsr2005@gmail.com';
          set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAdmin: isAdmin,
            role: isAdmin ? 'admin' : 'user',
          }).catch(error => {
            console.error("Error creating user profile in Realtime Database:", error);
          });
        }
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Authentication service not available.",
            description: "Please try again later.",
        });
        return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      handleSuccessfulLogin(userCredential);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: error.message,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Authentication service not available.",
            description: "Please try again later.",
        });
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      handleSuccessfulLogin(userCredential);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign-in Failed",
        description: error.message,
      });
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <QuantumDockLogo className="h-10 w-10 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
          <CardDescription>to continue to QuantumDock</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} suppressHydrationWarning />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} suppressHydrationWarning />
          </div>
          <Button onClick={handleSignIn} className="w-full" suppressHydrationWarning>
            Sign In
          </Button>
          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" suppressHydrationWarning>
            Sign in with Google
          </Button>
        </CardContent>
        <div className="mt-4 text-center text-sm p-6 pt-0">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
}
