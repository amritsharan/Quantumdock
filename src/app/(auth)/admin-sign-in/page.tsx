
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

export default function AdminSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const db = useDatabase();
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccessfulLogin = (userCredential: UserCredential) => {
    const user = userCredential.user;
    if (!user) return;
    
    // Check if the user is an admin
    if (user.email !== 'amritsr2005@gmail.com') {
        toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You are not authorized to access the admin panel.",
        });
        if(auth) signOut(auth);
        return;
    }
    
    // Immediately redirect to make the UI feel responsive
    router.push('/dashboard');
    
    if (db) {
      const userRef = ref(db, 'users/' + user.uid);
      const loginHistoryRef = ref(db, 'loginHistory/' + user.uid);

      push(loginHistoryRef, {
        loginTime: Date.now(),
        logoutTime: null,
      }).catch(error => {
          console.error("Error recording login event:", error);
      });

      get(userRef).then((snapshot) => {
        if (!snapshot.exists()) {
          set(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAdmin: true,
            role: 'admin',
          }).catch(error => {
            console.error("Error creating admin user profile:", error);
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
          <CardTitle className="text-3xl font-bold">Admin Sign In</CardTitle>
          <CardDescription>Enter your administrator credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} suppressHydrationWarning />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} suppressHydrationWarning />
          </div>
          <Button onClick={handleSignIn} className="w-full" suppressHydrationWarning>
            Sign In as Admin
          </Button>
          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" suppressHydrationWarning>
            Sign in with Google
          </Button>
        </CardContent>
         <div className="mt-4 text-center text-sm p-6 pt-0">
          Not an administrator?{' '}
          <Link href="/sign-in" className="underline">
            User Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
