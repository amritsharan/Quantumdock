
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { collection, Timestamp, query, orderBy, limit } from 'firebase/firestore';


interface LoginEvent {
  id: string;
  userId: string;
  email: string;
  loginTime: Timestamp; // Always a timestamp from Firestore
  logoutTime?: Timestamp;
}

// Helper to safely convert Firestore Timestamps to JS Dates
function toDate(timestamp: Timestamp | Date | undefined | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) { // Should not happen with serverTimestamps, but safe to have
    return timestamp;
  }
  return null;
}


function calculateDuration(loginTime: Date, logoutTime?: Date): string {
    if (!logoutTime) {
        return 'Active';
    }
    const durationMs = logoutTime.getTime() - loginTime.getTime();
    if (durationMs < 0) return '...'; // Should not happen
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    if (minutes < 1) {
        return `${seconds} sec`;
    }
    return `${minutes} min ${seconds} sec`;
}

export default function LoginHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const loginHistoryQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    // Query the sub-collection for the current user, ordering by login time
    return query(
        collection(firestore, 'users', user.uid, 'loginHistory'), 
        orderBy('loginTime', 'desc'), 
        limit(50) // Limit to the last 50 events for performance
    );
  }, [user, firestore]);

  const { data: history, isLoading: isHistoryLoading } = useCollection<LoginEvent>(loginHistoryQuery);

  const loading = isUserLoading || isHistoryLoading;

  return (
    <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Login History</h1>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Recent Logins</CardTitle>
            <CardDescription>A record of your recent login and logout activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Session Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    </TableRow>
                  ))
                ) : history && history.length > 0 ? (
                  history.map((event) => {
                    const loginDate = toDate(event.loginTime);
                    const logoutDate = toDate(event.logoutTime);
                    return (
                        <TableRow key={event.id}>
                            <TableCell>{event.email}</TableCell>
                            <TableCell>
                            {loginDate ? format(loginDate, "PPpp") : 'N/A'}
                            </TableCell>
                            <TableCell>
                            {logoutDate ? format(logoutDate, "PPpp") : 'Active'}
                            </TableCell>
                            <TableCell>
                            {loginDate ? calculateDuration(loginDate, logoutDate) : 'N/A'}
                            </TableCell>
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No login history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
