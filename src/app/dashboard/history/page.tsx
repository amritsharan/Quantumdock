'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface LoginEvent {
  id: string;
  userId: string;
  email: string;
  loginTime: { toDate: () => Date };
  logoutTime?: { toDate: () => Date };
}

function calculateDuration(loginTime: Date, logoutTime?: Date): string {
    if (!logoutTime) {
        return 'Active';
    }
    const durationMs = logoutTime.getTime() - loginTime.getTime();
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

  const historyQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'loginHistory'),
      where('userId', '==', user.uid),
      orderBy('loginTime', 'desc')
    );
  }, [user, firestore]);

  const { data: history, isLoading: isHistoryLoading } = useCollection<LoginEvent>(historyQuery as any);

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
                    const loginDate = event.loginTime?.toDate();
                    const logoutDate = event.logoutTime?.toDate();
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

    