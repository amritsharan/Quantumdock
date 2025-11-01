
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
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
}).refine((data) => data.newPassword === data.confirmPassword, {
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
    if (data.newPassword !== data.confirmPassword) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.newPassword);
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
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...register('newPassword')} />
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
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
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.4 0 128.6 111.8 16.8 244 16.8c70.3 0 129.8 27.8 174.4 72.4l-63.1 61.9C333.3 128.4 293.1 106 244 106c-73.2 0-132.3 59.2-132.3 132.3s59.1 132.3 132.3 132.3c78.2 0 114.5-56.3 118.8-85.3H244V261.8h244z"></path>
                </svg>
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

    