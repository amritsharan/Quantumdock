
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Separator } from '@/components/ui/separator';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match. Please enter the same password in both fields.",
    path: ["confirmPassword"], // path of error
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const handleSuccessfulSignUp = async (user: User, displayName?: string, phoneNumber?: string) => {
    if (!firestore) return;
    
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName,
            phoneNumber: phoneNumber || user.phoneNumber || '',
            createdAt: serverTimestamp(),
        });
    }

    toast({
        title: 'Account Ready',
        description: 'Your account is set up. Redirecting to sign in...',
    });

    router.push('/sign-in');
  }

  const onSubmit = async (data: SignUpFormValues) => {
    // This check is now redundant because of zod refinement, but good as a secondary check.
    if (data.password !== data.confirmPassword) {
      setAlertTitle('Password Mismatch');
      setAlertDescription('New password and confirm password are not the same, please give same passwords.');
      setShowErrorAlert(true);
      setError("confirmPassword", { type: "manual", message: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: 'Authentication service not available.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await handleSuccessfulSignUp(userCredential.user, data.displayName, data.phoneNumber);

    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAlertTitle('Email Already In Use');
        setAlertDescription('An account with this email address already exists. Please sign in to continue.');
        setShowErrorAlert(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: error.message || 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    if (!auth) {
        setAlertTitle('Sign Up Failed');
        setAlertDescription('Authentication service is not available. Please try again later.');
        setShowErrorAlert(true);
        setIsGoogleLoading(false);
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await handleSuccessfulSignUp(result.user);
    } catch (error: any) {
        console.error("Google sign in error", error);
         if (error.code === 'auth/email-already-in-use') {
            setAlertTitle('Email Already In Use');
            setAlertDescription('This email is already associated with an account. Please sign in.');
            setShowErrorAlert(true);
        } else {
            toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: error.message || "An unexpected error occurred during Google Sign-In.",
            });
        }
    } finally {
        setIsGoogleLoading(false);
    }
  };


  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-4 mb-4">
                <QuantumDockLogo className="h-14 w-14 text-primary" />
                <h1 className="text-3xl font-semibold tracking-tight">QuantumDock</h1>
            </div>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" type="text" {...register('displayName')} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
             <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input id="phoneNumber" type="tel" {...register('phoneNumber')} />
              {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
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
                <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 2.84-2.34 5.23-4.9 6.84l7.98 6.19c4.63-4.28 7.4-10.32 7.4-17z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.42-4.82 2.24-7.91 2.24-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
            )}
            Sign up with Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="underline">
              Sign in
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
            {alertTitle === 'Email Already In Use' ? (
                 <AlertDialogAction onClick={() => router.push('/sign-in')}>
                    Go to Sign In
                </AlertDialogAction>
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
