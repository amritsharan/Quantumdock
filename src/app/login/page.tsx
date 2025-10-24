
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import app from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showUserNotFoundDialog, setShowUserNotFoundDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const auth = getAuth(app);
    const db = getFirestore(app);

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        
        // Record login history in a separate operation with its own error handling
        const loginHistoryData = {
          userId: user.uid,
          email: user.email,
          timestamp: serverTimestamp()
        };
        const loginHistoryCollection = collection(db, 'login_history');
        
        addDoc(loginHistoryCollection, loginHistoryData)
          .catch((serverError) => {
            // This is the specific error handling for Firestore permissions
            const permissionError = new FirestorePermissionError({
                path: loginHistoryCollection.path,
                operation: 'create',
                requestResourceData: loginHistoryData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
        router.push('/');
      })
      .catch((error: any) => {
        // This catch block now primarily handles authentication errors
        if (error.code === 'auth/user-not-found') {
          setShowUserNotFoundDialog(true);
        } else if (error.code === 'auth/invalid-credential') {
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: 'Invalid credentials. Please check your email and password.',
          });
        } else {
          // Fallback for other auth errors
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: error.message,
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address to reset your password.',
      });
      return;
    }
    setIsLoading(true);
    const auth = getAuth(app);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for password reset instructions.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
       <AlertDialog open={showUserNotFoundDialog} onOpenChange={setShowUserNotFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Not Found</AlertDialogTitle>
            <AlertDialogDescription>
              No account was found with that email address. Would you like to create a new account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/signup')}>Continue to Sign Up</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <UserCircle className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="link" type="button" className="ml-auto inline-block text-sm underline">
                        Forgot your password?
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter your email address and we will send you a link to reset your password.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="grid gap-2">
                        <Label htmlFor="reset-email" className="sr-only">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePasswordReset}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
