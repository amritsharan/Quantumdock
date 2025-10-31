
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, UserCredential, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

export default function AdminSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccessfulLogin = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    if (!user) return;
    
    // Check if the user is the specific admin
    if (user.email !== 'amritsr2005@gmail.com') {
        toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You are not authorized to access the admin panel.",
        });
        if(auth) await signOut(auth);
        return;
    }
    
    // Immediately redirect to make the UI feel responsive
    router.push('/welcome-admin');
    
    if (firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      const loginHistoryRef = collection(firestore, 'users', user.uid, 'loginHistory');

      await addDoc(loginHistoryRef, {
        loginTime: Date.now(),
        logoutTime: null,
      }).catch(error => {
          console.error("Error recording login event:", error);
      });

      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Admin',
          photoURL: user.photoURL,
          isAdmin: true,
          role: 'admin',
        }, { merge: true }).catch(error => {
          console.error("Error creating/updating admin user profile:", error);
        });
      } else {
        // Ensure isAdmin is set even if profile exists
        await setDoc(userRef, { isAdmin: true, role: 'admin' }, { merge: true });
      }
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
    
    // The password will be verified by Firebase Authentication
    // We only need to check the email after a successful sign-in
    if (email !== 'amritsr2005@gmail.com') {
         toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: "This email is not registered as an administrator.",
         });
         return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "Invalid credentials. Please check your email and password.",
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
      await handleSuccessfulLogin(userCredential);
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
