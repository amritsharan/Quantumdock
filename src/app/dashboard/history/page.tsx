'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';

type LoginHistory = {
  loginTime: { seconds: number; nanoseconds: number };
  logoutTime?: { seconds: number; nanoseconds: number };
  status: 'active' | 'inactive';
  duration?: number;
};

const calculateDuration = (loginDate: Date, logoutDate?: Date) => {
    if (logoutDate) {
        const diffInMinutes = Math.round((logoutDate.getTime() - loginDate.getTime()) / (1000 * 60));
        return `${diffInMinutes} minute(s)`;
    }
    return `${formatDistanceToNow(loginDate)} (so far)`;
};


export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState(new Date());

  const historyQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'loginHistory'),
      orderBy('loginTime', 'desc')
    );
  }, [user, firestore]);

  const { data: history, isLoading } = useCollection<LoginHistory>(historyQuery);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const formattedHistory = useMemo(() => {
    return history?.map((item) => {
      const loginDate = item.loginTime ? new Date(item.loginTime.seconds * 1000) : null;
      const logoutDate = item.logoutTime ? new Date(item.logoutTime.seconds * 1000) : undefined;
      const duration = item.duration !== undefined ? `${item.duration} minute(s)` : (loginDate ? calculateDuration(loginDate, logoutDate) : 'N/A');

      return {
        ...item,
        loginTimeFormatted: loginDate ? format(loginDate, 'PPpp') : 'N/A',
        logoutTimeFormatted: logoutDate ? format(logoutDate, 'PPpp') : 'N/A',
        calculatedDuration: duration,
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
        <CardHeader>
          <CardTitle>Login History</CardTitle>
          <CardDescription>
            Here is a record of your recent login activity.
          </CardDescription>
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
                    <TableCell>{item.status === 'active' ? '—' : item.logoutTimeFormatted}</TableCell>
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
