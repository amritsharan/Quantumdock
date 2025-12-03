
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';


type LoginHistory = {
  id: string;
  loginTime: { seconds: number; nanoseconds: number };
  logoutTime?: { seconds: number; nanoseconds: number };
  status: 'active' | 'inactive';
  duration?: number;
  userId: string;
};


const calculateActiveDuration = (loginDate: Date) => {
    return `${formatDistanceToNow(loginDate)} (so far)`;
};


export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);
  
  const userId = user ? user.uid : null;

  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
        collection(firestore, 'users', userId, 'loginHistory'),
        orderBy('loginTime', 'desc')
    );
  }, [firestore, userId]);

  const { data: allHistory, isLoading, error } = useCollection<WithId<LoginHistory>>(historyQuery);

  useEffect(() => {
    setHydrated(true);
    // This timer updates the "active" session's duration every minute.
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const formattedHistory = useMemo(() => {
    if (!allHistory) return null;
    
    return allHistory.map((item) => {
      const loginDate = item.loginTime ? new Date(item.loginTime.seconds * 1000) : null;
      
      let logoutTimeFormatted = '—';
      if (item.logoutTime) {
        logoutTimeFormatted = format(new Date(item.logoutTime.seconds * 1000), 'PPpp');
      } else if (item.status === 'inactive' && loginDate && item.duration) {
        const calculatedLogoutDate = addMinutes(loginDate, item.duration);
        logoutTimeFormatted = format(calculatedLogoutDate, 'PPpp');
      }

      let durationDisplay;
      if (item.status === 'active' && loginDate && hydrated && currentTime) {
        // This part now only runs if currentTime is available (client-side after hydration)
        durationDisplay = calculateActiveDuration(loginDate);
      } else if (item.duration !== undefined) {
        durationDisplay = `${item.duration} minute(s)`;
      } else {
        durationDisplay = 'N/A';
      }

      return {
        ...item,
        loginDate: loginDate,
        loginTimeFormatted: loginDate ? format(loginDate, 'PPpp') : 'N/A',
        logoutTimeFormatted: logoutTimeFormatted,
        calculatedDuration: durationDisplay,
      };
    });
  }, [allHistory, hydrated, currentTime]);


  const renderSkeleton = () => (
    <TableRow>
        <TableCell colSpan={4}>
            <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        </TableCell>
    </TableRow>
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
                <CardTitle>Login History</CardTitle>
                <CardDescription>
                    Here is a record of your recent login activity. Click a login time to see simulations for that session.
                </CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Login Time</TableHead>
                <TableHead>Logout Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || !hydrated) && !error && renderSkeleton()}
              {error && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive">
                        Error loading history: Insufficient permissions.
                    </TableCell>
                </TableRow>
              )}
              {hydrated && !isLoading && !error && formattedHistory?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No login history found.
                  </TableCell>
                </TableRow>
              )}
              {hydrated && !isLoading && !error &&
                formattedHistory?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/dashboard/history/${item.id}`} className="font-medium text-primary hover:underline">
                        {item.loginTimeFormatted}
                      </Link>
                    </TableCell>
                    <TableCell>{item.logoutTimeFormatted}</TableCell>
                    <TableCell>{item.calculatedDuration}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'active' ? 'default' : 'destructive'} className={item.status === 'active' ? 'bg-green-500' : ''}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
