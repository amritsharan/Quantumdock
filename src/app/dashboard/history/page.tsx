
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
  loginTime: { seconds: number; nanoseconds: number };
  logoutTime?: { seconds: number; nanoseconds: number };
  status: 'active' | 'inactive';
  duration?: number;
};

const calculateActiveDuration = (loginDate: Date) => {
    return `${formatDistanceToNow(loginDate)} (so far)`;
};


export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set the current time only on the client, after hydration
    setCurrentTime(new Date());

    // This timer updates the "active" session's duration every minute.
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const historyQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'loginHistory'),
      orderBy('loginTime', 'desc')
    );
  }, [user, firestore]);

  const { data: history, isLoading } = useCollection<LoginHistory>(historyQuery);

  const formattedHistory = useMemo(() => {
    return history?.map((item) => {
      const loginDate = item.loginTime ? new Date(item.loginTime.seconds * 1000) : null;
      
      let logoutTimeFormatted = '—';
      if (item.logoutTime) {
        logoutTimeFormatted = format(new Date(item.logoutTime.seconds * 1000), 'PPpp');
      } else if (item.status === 'inactive' && loginDate && item.duration) {
        const calculatedLogoutDate = addMinutes(loginDate, item.duration);
        logoutTimeFormatted = format(calculatedLogoutDate, 'PPpp');
      }

      let durationDisplay;
      if (item.status === 'active' && loginDate) {
        durationDisplay = currentTime ? calculateActiveDuration(loginDate) : 'Calculating...';
      } else if (item.duration !== undefined) {
        durationDisplay = `${item.duration} minute(s)`;
      } else {
        durationDisplay = 'N/A';
      }

      return {
        ...item,
        loginTimeFormatted: loginDate ? format(loginDate, 'PPpp') : 'N/A',
        logoutTimeFormatted: logoutTimeFormatted,
        calculatedDuration: durationDisplay,
      };
    });
  }, [history, currentTime]);


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
                    Here is a record of your recent login activity.
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
              {isLoading && renderSkeleton()}
              {!isLoading && formattedHistory?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No login history found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                formattedHistory?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.loginTimeFormatted}</TableCell>
                    <TableCell>{item.logoutTimeFormatted}</TableCell>
                    <TableCell>{item.calculatedDuration}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={item.status === 'active' ? 'bg-green-500' : ''}>
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
