
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, User, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, serverTimestamp, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [errorType, setErrorType] = useState<'user-not-found' | 'wrong-password' | 'generic'>('generic');
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleSuccessfulLogin = (user: User) => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      getDoc(userDocRef).then(userDoc => {
        if (!userDoc.exists()) {
          setDocumentNonBlocking(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
      });
      
      const historyQuery = query(
          collection(firestore, "users", user.uid, "loginHistory"),
          where("status", "==", "active"),
          orderBy("loginTime", "desc"),
          limit(1)
      );

      getDocs(historyQuery).then(querySnapshot => {
        if (!querySnapshot.empty) {
            const activeSessionDoc = querySnapshot.docs[0];
            updateDocumentNonBlocking(activeSessionDoc.ref, {
                status: 'inactive',
                logoutTime: serverTimestamp()
            });
        }
      });
      
      addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'loginHistory'), {
        userId: user.uid,
        loginTime: serverTimestamp(),
        status: 'active',
      });
    }
    
    toast({
      title: 'Sign In Successful',
      description: "Welcome back! You're being redirected to your dashboard.",
    });

    router.push('/dashboard');
  };

  const onSubmit = async (data: SignInFormValues) => {
    setIsLoading(true);
    setErrorType('generic');
    if (!auth) {
      setAlertTitle('Sign In Failed');
      setAlertDescription('Authentication service is not available. Please try again later.');
      setShowErrorAlert(true);
      setIsLoading(false);
      return;
    }

    // Special case for the specified user
    if (data.email === 'amritsr2005@gmail.com' && data.password === 'Vasishta@2005') {
      try {
        // Attempt to sign in first
        const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        handleSuccessfulLogin(userCredential.user);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          // If the user doesn't exist, create it.
          try {
            const newUserCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            handleSuccessfulLogin(newUserCredential.user);
          } catch (creationError: any) {
             console.error('Special user creation error:', creationError);
             setAlertTitle('Sign In Failed');
             setAlertDescription(creationError.message || 'Could not create the special user account.');
             setErrorType('generic');
             setShowErrorAlert(true);
          }
        } else {
          // Other sign-in error for the special user
          console.error('Special user sign in error:', error);
          setAlertTitle('Sign In Failed');
          setAlertDescription(error.message || 'An unexpected error occurred. Please try again.');
          setErrorType('generic');
          setShowErrorAlert(true);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }


    // Normal user flow
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        setAlertTitle("Account Not Found");
        setAlertDescription("No account found with this email. Would you like to create one?");
        setErrorType('user-not-found');
        setShowErrorAlert(true);
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setAlertTitle("Authentication Failed");
        setAlertDescription("Invalid credentials. Please check your email and password and try again.");
        setErrorType('wrong-password');
        setShowErrorAlert(true);
      } else {
        console.error('Sign in error:', error);
        setAlertTitle('Sign In Failed');
        setAlertDescription(error.message || 'An unexpected error occurred. Please try again.');
        setErrorType('generic');
        setShowErrorAlert(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    if (!auth) {
        setAlertTitle('Sign In Failed');
        setAlertDescription('Authentication service is not available. Please try again later.');
        setShowErrorAlert(true);
        setIsGoogleLoading(false);
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        handleSuccessfulLogin(result.user);
    } catch (error: any) {
        console.error("Google sign in error", error);
        setAlertTitle("Google Sign-In Failed");
        setAlertDescription(error.message || "An error occurred during Google Sign-In. Please try again.");
        setShowErrorAlert(true);
    } finally {
        setIsGoogleLoading(false);
    }
  };


  if (!hydrated) {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-8 w-40" />
                </div>
                <Skeleton className="h-7 w-24 mx-auto" />
                <Skeleton className="h-5 w-64 mx-auto" />
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-sm text-muted-foreground">OR</span>
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-5 w-48 mx-auto" />
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4 mb-4">
                <QuantumDockLogo className="h-14 w-14 text-primary" />
                <h1 className="text-3xl font-semibold tracking-tight">QuantumDock</h1>
            </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>
          
          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-sm text-muted-foreground">OR</span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="#4285F4" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 261.8 0 123.3 111.8 11.8 244 11.8c70.3 0 132.3 28.1 176.9 72.3L344.9 160.4c-28.1-26.6-67.5-42.9-100.9-42.9-83.3 0-151.7 68.4-151.7 152.9s68.4 152.9 151.7 152.9c90.8 0 133.5-62.1 137.9-93.7H244v-75.2h243.8c1.3 7.8 2.2 15.6 2.2 23.4z"></path><path fill="#34A853" d="M244 488c132.2 0 240-107.8 240-240S376.2 8 244 8 4 115.8 4 248s107.8 240 240 240z" style={{fill: 'transparent'}}></path><g><path fill="#FBBC05" d="M107.6 182.2c-15.1 30.6-24.1 65-24.1 101.4s9 70.8 24.1 101.4L28.1 454.4c-23.5-46.7-37.1-99.7-37.1-156.2s13.6-109.5 37.1-156.2l79.5 60.2z" style={{fill:'transparent'}}></path><path fill="#EA4335" d="M488 261.8c0-21.6-2.5-42.5-7.3-62.6H244v115.3h136.1c-5.4 35.8-21.7 66.7-45.7 87.9l79.5 61.9c52.3-48.4 82.2-118.5 82.2-192.1z" style={{fill:'transparent'}}></path></g></svg>
            )}
            Sign in with Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <Toaster />

      <AlertDialog open={showErrorAlert} onOpenChange={setShowErrorAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {errorType === 'user-not-found' ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push('/sign-up')}>
                  Create Account
                </AlertDialogAction>
              </>
            ) : (
               <AlertDialogAction onClick={() => setShowErrorAlert(false)}>
                  Close
                </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    