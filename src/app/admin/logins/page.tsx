
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { withAuth } from '@/components/with-auth';
import app from '@/firebase/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceStrict } from 'date-fns';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Badge } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface LoginRecord {
  id: string;
  email: string;
  timestamp: Date | null;
  logoutTimestamp: Date | null;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) result += `${remainingSeconds}s`;
  
  return result.trim();
}


function LoginHistoryPage() {
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoginHistory() {
      setLoading(true);
      setError(null);
      const db = getFirestore(app);
      const loginHistoryCollection = collection(db, 'login_history');
      const q = query(loginHistoryCollection, orderBy('timestamp', 'desc'));

      try {
        const querySnapshot = await getDocs(q);
        const loginRecords = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : null;
          const logoutTimestamp = data.logoutTimestamp instanceof Timestamp ? data.logoutTimestamp.toDate() : null;
          return {
            id: doc.id,
            email: data.email,
            timestamp: timestamp,
            logoutTimestamp: logoutTimestamp,
          };
        });
        setLogins(loginRecords);
      } catch (serverError) {
        const permissionError = new FirestorePermissionError({
          path: loginHistoryCollection.path,
          operation: 'list', 
        });
        errorEmitter.emit('permission-error', permissionError);
        setError("You don't have permission to view login history.");
      } finally {
        setLoading(false);
      }
    }

    fetchLoginHistory();
  }, []);

  const getSessionDuration = (login: LoginRecord) => {
    if (!login.timestamp) return 'N/A';
    if (!login.logoutTimestamp) {
        return <span className="text-green-500 font-semibold">Still active</span>;
    }
    const durationInSeconds = (login.logoutTimestamp.getTime() - login.timestamp.getTime()) / 1000;
    return formatDuration(durationInSeconds);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
        </div>
        <Button asChild variant="outline">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Dashboard
            </Link>
        </Button>
      </header>
      <main className="flex flex-1 justify-center p-4 md:p-6">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Login History</CardTitle>
            <CardDescription>A record of all user login events and session durations.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
                 <div className="text-center text-destructive">{error}</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Login Timestamp</TableHead>
                  <TableHead>Session Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : logins.length > 0 ? (
                  logins.map(login => (
                    <TableRow key={login.id}>
                      <TableCell className="font-medium">{login.email}</TableCell>
                      <TableCell>
                        {login.timestamp ? format(login.timestamp, "PPP p") : 'No timestamp'}
                      </TableCell>
                       <TableCell>
                        {getSessionDuration(login)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No login history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(LoginHistoryPage);
