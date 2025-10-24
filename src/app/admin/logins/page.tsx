
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { withAuth } from '@/components/with-auth';
import app from '@/firebase/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface LoginRecord {
  id: string;
  email: string;
  timestamp: Date | null;
}

function LoginHistoryPage() {
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoginHistory() {
      setLoading(true);
      const db = getFirestore(app);
      const q = query(collection(db, 'login_history'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const loginRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Firestore timestamps need to be converted to JS Date objects
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : null;
        return {
          id: doc.id,
          email: data.email,
          timestamp: timestamp,
        };
      });
      setLogins(loginRecords);
      setLoading(false);
    }

    fetchLoginHistory();
  }, []);

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
            <CardDescription>A record of all user login events.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Login Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    </TableRow>
                  ))
                ) : logins.length > 0 ? (
                  logins.map(login => (
                    <TableRow key={login.id}>
                      <TableCell className="font-medium">{login.email}</TableCell>
                      <TableCell>
                        {login.timestamp ? format(login.timestamp, "PPP p") : 'No timestamp'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      No login history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(LoginHistoryPage);
