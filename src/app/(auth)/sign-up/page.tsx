
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, User } from 'firebase/auth';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Skeleton } from '@/components/ui/skeleton';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match. Please enter the same password in both fields.",
    path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;


function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      const email = searchParams.get('email');
      if (email) {
        setValue('email', email);
      }
    }
  }, [searchParams, setValue, hydrated]);

  const handleSuccessfulSignUp = (user: User) => {
    toast({
        title: 'Account Created',
        description: 'Your account has been successfully created. Redirecting to dashboard...',
    });
    router.push('/dashboard');
  }

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    if (!auth) {
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
      handleSuccessfulSignUp(userCredential.user);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAlertTitle('Email Already In Use');
        setAlertDescription('An account with this email address already exists. Would you like to sign in instead?');
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

  if (!hydrated) {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="mb-4 flex flex-col items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="mx-auto h-8 w-40" />
                </div>
                <Skeleton className="mx-auto h-7 w-24" />
                <Skeleton className="mx-auto h-5 w-48" />
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid gap-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="grid gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="mx-auto h-5 w-56" />
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex flex-col items-center gap-4">
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                 <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </form>

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
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/sign-in?email=${encodeURIComponent(getValues('email'))}`)}>
                    Go to Sign In
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


export default function SignUpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignUpForm />
        </Suspense>
    )
}
