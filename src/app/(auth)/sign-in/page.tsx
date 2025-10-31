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
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSuccessfulLogin = async (user: User) => {
    // Create a login history record
    if (user && firestore) {
      try {
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
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'Authentication service is not available. Please try again later.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
}
