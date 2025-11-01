
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
import { signInWithEmailAndPassword, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
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
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

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

  const handleSuccessfulLogin = async (user: User) => {
    // Create a login history record
    if (user && firestore) {
      // Check if user profile exists, if not, create it
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
        });
      }
      
      try {
        const historyQuery = query(
            collection(firestore, "users", user.uid, "loginHistory"),
            where("status", "==", "active"),
            orderBy("loginTime", "desc"),
            limit(1)
        );
        const querySnapshot = await getDocs(historyQuery);
        if (!querySnapshot.empty) {
            const activeSessionDoc = querySnapshot.docs[0];
            await updateDoc(activeSessionDoc.ref, {
                status: 'inactive',
                logoutTime: serverTimestamp()
            });
        }

        await addDoc(collection(firestore, 'users', user.uid, 'loginHistory'), {
          userId: user.uid,
          loginTime: serverTimestamp(),
          status: 'active',
        });
      } catch (error) {
        console.error("Failed to write login history", error);
        // Don't block login if history write fails
      }
    }
    
    toast({
      title: 'Sign In Successful',
      description: "Welcome back! You're being redirected to your dashboard.",
    });

    router.push('/dashboard');
  };

  const onSubmit = async (data: SignInFormValues) => {
    setIsLoading(true);
    if (!auth) {
      setAlertTitle('Sign In Failed');
      setAlertDescription('Authentication service is not available. Please try again later.');
      setShowErrorAlert(true);
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setAlertTitle("Authentication Failed");
        setAlertDescription("The user isn't found with this credential. please create the account.");
        setShowErrorAlert(true);
      } else {
        console.error('Sign in error:', error);
        setAlertTitle('Sign In Failed');
        setAlertDescription(error.message || 'An unexpected error occurred. Please try again.');
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
        await handleSuccessfulLogin(result.user);
    } catch (error: any) {
        console.error("Google sign in error", error);
        setAlertTitle("Google Sign-In Failed");
        setAlertDescription(error.message || "An error occurred during Google Sign-In. Please try again.");
        setShowErrorAlert(true); // Re-use the same alert dialog for simplicity
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
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="48" height="48" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FFC107" d="M3.055,24c0-1.89,0.276-3.71,0.781-5.43L0.395,13.15C0.14,16.63,0,20.25,0,24s0.14,7.37,0.395,10.85l3.441-5.42C3.331,27.71,3.055,25.89,3.055,24z"></path><path fill="#34A853" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-4.839C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#EB4335" d="M44.945,13.15l-3.441,5.42C39.669,14.291,36.786,12,33.5,12c-3.141,0-5.996,1.411-7.961,3.689l-5.657-5.657C24.004,6.053,29.268,4,34.5,4 C38.566,4,42.348,6.002,44.945,13.15z"></path>
                </svg>
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
            <AlertDialogAction onClick={() => router.push('/sign-up')}>
              Create an Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
