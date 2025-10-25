
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, addDoc, collection, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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
} from "@/components/ui/alert-dialog"
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { ForgotPasswordDialog } from '@/components/quantum-dock/forgot-password-dialog';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.08 2.25-4.49 0-8.16-3.6-8.16-8.16s3.67-8.16 8.16-8.16c2.53 0 4.21.99 5.16 1.89l2.6-2.6C16.99 1.91 14.98 1 12.48 1 5.88 1 1 5.95 1 12.5s4.88 11.5 11.48 11.5c6.96 0 11.28-4.82 11.28-11.35 0-.73-.07-1.44-.2-2.15h-11.1z" />
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showUserNotFoundDialog, setShowUserNotFoundDialog] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const recordLogin = (user: any) => {
    const { firestore } = initializeFirebase();
    const loginHistoryData = {
      userId: user.uid,
      email: user.email,
      timestamp: serverTimestamp()
    };
    const loginHistoryCollection = collection(firestore, 'login_history');
    
    addDoc(loginHistoryCollection, loginHistoryData)
      .then((docRef) => {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('loginRecordId', docRef.id);
        }
        router.push('/');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: loginHistoryCollection.path,
            operation: 'create',
            requestResourceData: loginHistoryData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // Still route the user even if logging fails
        router.push('/');
      });
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { auth, firestore } = initializeFirebase();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, if not create it
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const nameParts = user.displayName?.split(' ') || ['',''];
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const userProfileData = {
          firstName: firstName,
          lastName: lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || ''
        };

        await setDoc(userDocRef, userProfileData).catch((dbError) => {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }
      
      recordLogin(user);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { auth } = initializeFirebase();
    
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        recordLogin(userCredential.user);
      })
      .catch((error: any) => {
        if (error.code === 'auth/user-not-found') {
          setShowUserNotFoundDialog(true);
        } else if (error.code === 'auth/invalid-credential') {
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: 'Invalid credentials. Please check your email and password.',
          });
        } else {
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
                suppressHydrationWarning
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {isClient && <ForgotPasswordDialog />}
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>

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
