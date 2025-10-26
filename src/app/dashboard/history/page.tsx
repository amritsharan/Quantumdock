
'use client';

import { useState, useMemo } from 'react';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { doc } from 'firebase/firestore';


interface LoginEvent {
  id: string;
  userId: string;
  email: string;
  loginTime: { toDate: () => Date };
  logoutTime?: { toDate: () => Date };
}

interface UserProfile {
    loginEvents?: LoginEvent[];
}

function calculateDuration(loginTime: Date, logoutTime?: Date): string {
    if (!logoutTime) {
        return 'Active';
    }
    const durationMs = logoutTime.getTime() - loginTime.getTime();
    if (durationMs < 0) return '...'; // logoutTime might not be synced yet
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

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isHistoryLoading } = useDoc<UserProfile>(userDocRef);

  const history = useMemo(() => {
    if (!userProfile || !Array.isArray(userProfile.loginEvents)) return [];
    // Create a mutable copy before sorting
    return [...userProfile.loginEvents].sort((a, b) => {
        const timeA = a.loginTime?.toDate?.()?.getTime() || 0;
        const timeB = b.loginTime?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
    });
  }, [userProfile]);

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
                  history.map((event, index) => {
                    // Firestore timestamps need to be converted to JS Dates
                    const loginDate = event.loginTime?.toDate ? event.loginTime.toDate() : null;
                    const logoutDate = event.logoutTime?.toDate ? event.logoutTime.toDate() : null;
                    return (
                        <TableRow key={`${event.userId}-${index}`}>
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
