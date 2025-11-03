
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
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, User, GoogleAuthProvider, signInWithRedirect, sendPasswordResetEmail, getRedirectResult } from 'firebase/auth';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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


const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;


export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [errorType, setErrorType] = useState<'user-not-found' | 'wrong-password' | 'generic'>('generic');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });


  useEffect(() => {
    if (auth) {
        setIsGoogleLoading(true);
        getRedirectResult(auth)
            .then((result) => {
                if (result && result.user) {
                    handleSuccessfulLogin(result.user);
                }
            })
            .catch((error) => {
                console.error("Google sign in redirect error", error);
                setAlertTitle("Google Sign-In Failed");
                setAlertDescription(error.message || "An error occurred during Google Sign-In. Please try again.");
                setErrorType('generic');
                setShowErrorAlert(true);
            }).finally(() => {
                setIsGoogleLoading(false);
            });
    }
  }, [auth]);

  const handleSuccessfulLogin = (user: User) => {
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
      handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        setErrorType('user-not-found');
        setAlertTitle("Account Not Found");
        setAlertDescription("No account found with this email. Would you like to create one?");
        setShowErrorAlert(true);
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErrorType('wrong-password');
        setAlertTitle("Authentication Failed");
        setAlertDescription("Invalid credentials. Please check your email and password and try again.");
        setShowErrorAlert(true);
      } else {
        setErrorType('generic');
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
    await signInWithRedirect(auth, provider);
  };
  
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setIsResettingPassword(true);
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Authentication service not available.' });
      setIsResettingPassword(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${data.email}, you will receive a password reset link.`,
      });
      setShowForgotPasswordDialog(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send password reset email. Please try again.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };


  if (!auth) {
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="text-sm underline"
                  onClick={(e) => {
                    e.preventDefault();
                    forgotPasswordForm.setValue('email', getValues('email'));
                    setShowForgotPasswordDialog(true);
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
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
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading || isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2 h-4 w-4">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 3.02-2.31 5.58-4.9 7.32l7.98 6.19c4.63-4.28 7.3-10.43 7.3-17.52z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.42-4.82 2.26-7.91 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
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
            {errorType === 'user-not-found' ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(`/sign-up?email=${encodeURIComponent(getValues('email'))}`)}>
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

      <AlertDialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <AlertDialogContent>
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Your Password</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter your email address below and we&apos;ll send you a link to reset your password.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="m@example.com"
                    {...forgotPasswordForm.register('email')}
                  />
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {forgotPasswordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" onClick={() => setShowForgotPasswordDialog(false)}>Cancel</AlertDialogCancel>
                <Button type="submit" disabled={isResettingPassword}>
                  {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </AlertDialogFooter>
            </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    