
'use client';

import { useEffect, useState } from 'react';
import { useUser, useDatabase } from '@/firebase';
import { ref, query, onValue, off, orderByChild, limitToLast } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type LoginEvent = {
  id: string;
  loginTime: number;
  logoutTime?: number;
};

export default function HistoryPage() {
  const { user } = useUser();
  const db = useDatabase();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const historyQuery = query(ref(db, 'loginHistory/' + user.uid), orderByChild('loginTime'), limitToLast(50));

    const handleValueChange = onValue(historyQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const events: LoginEvent[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => b.loginTime - a.loginTime); 
        setHistory(events);
      } else {
        setHistory([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching login history:", error);
      setIsLoading(false);
    });

    return () => {
        if(historyQuery) {
            off(historyQuery, 'value', handleValueChange);
        }
    };
  }, [user, db]);
  
  const toDate = (timestamp: number) => new Date(timestamp);
  
  const getDuration = (login: number, logout: number | undefined) => {
    if (!logout) return <Badge variant="secondary">Active</Badge>;
    const durationInSeconds = (logout - login) / 1000;
    if (durationInSeconds < 60) return `${Math.round(durationInSeconds)} seconds`;
    const durationInMinutes = durationInSeconds / 60;
    if (durationInMinutes < 60) return `${Math.round(durationInMinutes)} minutes`;
    const durationInHours = durationInMinutes / 60;
    return `${Math.round(durationInHours)} hours`;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
          <CardDescription>
            Here is a list of your 50 most recent login and logout times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : history.length > 0 ? (
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
                      {getDuration(event.loginTime, event.logoutTime)}
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
