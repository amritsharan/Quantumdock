
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, UserCredential, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccessfulSignUp = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    if (user) {
      const displayName = `${firstName} ${lastName}`.trim();
      
      await updateProfile(user, { displayName }).catch(error => {
        console.error("Error updating Firebase Auth profile:", error);
      });

      if (firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        const isAdmin = user.email === 'amritsr2005@gmail.com';
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
           await setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: displayName,
              photoURL: user.photoURL,
              firstName: firstName,
              lastName: lastName,
              phoneNumber: phoneNumber,
              role: isAdmin ? 'admin' : 'user',
              isAdmin: isAdmin,
            }).catch(error => {
              console.error("Error creating user profile in Firestore:", error);
            });
        }
      }
    }
    toast({
        title: "Account Created!",
        description: "Your account has been created successfully.",
    });

    setTimeout(() => {
        router.push('/sign-in');
    }, 2000); // Wait 2 seconds before redirecting
  };

  const handleSignUp = async () => {
    if (!auth) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleSuccessfulSignUp(userCredential);
    } catch (error: any) {
       if (error.code === 'auth/email-already-in-use') {
         toast({
            variant: "destructive",
            title: "Sign-up Failed",
            description: "An account with this email already exists.",
         });
       } else {
         toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: error.message,
        });
       }
    }
  };

  const handleGoogleSignUp = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      if (user && firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            const nameParts = user.displayName?.split(' ') || [];
            const isAdmin = user.email === 'amritsr2005@gmail.com';
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                phoneNumber: user.phoneNumber || '',
                role: isAdmin ? 'admin' : 'user',
                isAdmin: isAdmin,
            }).catch(error => {
                console.error("Error creating user profile via Google Sign-Up:", error);
            });
        }
      }
      toast({
          title: "Account Created!",
          description: "Your account has been created successfully.",
      });

      setTimeout(() => {
          router.push('/sign-in');
      }, 2000);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({
                variant: "destructive",
                title: "Sign-up Failed",
                description: "An account with this email already exists.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Google Sign-up Failed",
                description: error.message,
            });
        }
    }
  };


  return (
    <>
    <Toaster />
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" placeholder="John" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" placeholder="Doe" required value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+1 (555) 555-5555" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleSignUp} className="w-full">
            Create Account
          </Button>
          <Button onClick={handleGoogleSignUp} variant="outline" className="w-full">
            Sign up with Google
          </Button>
        </CardContent>
        <div className="mt-4 text-center text-sm p-6 pt-0">
          Already have an account?{' '}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
    </>
  );
}
