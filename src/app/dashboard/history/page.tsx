
'use client';

import { useEffect, useState } from 'react';
import { useUser, useDatabase } from '@/firebase';
import { ref, query, onValue, off, orderByChild } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

type LoginEvent = {
  id: string;
  loginTime: number;
  logoutTime?: number;
};

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useDatabase();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || !user || !db) {
      setIsLoading(isUserLoading);
      return;
    }

    const historyQuery = query(ref(db, 'loginHistory/' + user.uid), orderByChild('loginTime'));

    const unsubscribe = onValue(historyQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const events: LoginEvent[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => b.loginTime - a.loginTime); // Sort descending
        setHistory(events);
      } else {
        setHistory([]);
      }
      setIsLoading(false);
    });

    return () => off(historyQuery, 'value', unsubscribe);
  }, [user, db, isUserLoading]);
  
  const toDate = (timestamp: number) => new Date(timestamp);
  
  const getDuration = (login: number, logout: number | undefined) => {
    if (!logout) return <Badge variant="secondary">Active</Badge>;
    const duration = formatDistanceToNow(login, { addSuffix: false, includeSeconds: true });
    return `${(logout-login)/1000} seconds`;
  }
  
  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
          <CardDescription>
            Here is a list of your recent login and logout times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{format(toDate(event.loginTime), 'PPP p')}</TableCell>
                    <TableCell>
                      {event.logoutTime ? (
                        format(toDate(event.logoutTime), 'PPP p')
                      ) : (
                        <Badge variant="secondary">Active Session</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.logoutTime ?
                        formatDistanceToNow(toDate(event.logoutTime), { addSuffix: true, unit: 'minute', 'numeric': 'always', 'roundingMethod': 'floor' })
                        :
                        <Badge variant="secondary">In Progress</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No login history found.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

