
'use client';

import { useEffect, useState } from 'react';
import { useUser, useDatabase } from '@/firebase';
import { ref, query, onValue, off, orderByChild, limitToLast } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

type LoginEvent = {
  id: string;
  loginTime: number;
  logoutTime?: number;
};

export default function HistoryPage() {
  const { user } = useUser();
  const db = useDatabase();
  const [history, setHistory] = useState<LoginEvent[]>([]);

  useEffect(() => {
    if (!user || !db) {
      return;
    }

    // Query for the last 50 login events, ordered by loginTime
    const historyQuery = query(ref(db, 'loginHistory/' + user.uid), orderByChild('loginTime'), limitToLast(50));

    const unsubscribe = onValue(historyQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase returns the data. We convert it to an array and sort descending.
        const events: LoginEvent[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })).sort((a, b) => b.loginTime - a.loginTime); 
        setHistory(events);
      } else {
        setHistory([]);
      }
    });

    // Cleanup subscription on unmount
    return () => off(historyQuery, 'value', unsubscribe);
  }, [user, db]);
  
  const toDate = (timestamp: number) => new Date(timestamp);
  
  const getDuration = (login: number, logout: number | undefined) => {
    if (!logout) return <Badge variant="secondary">Active</Badge>;
    // Simple duration calculation, can be improved with date-fns if needed
    const durationInSeconds = (logout - login) / 1000;
    if (durationInSeconds < 60) return `${Math.round(durationInSeconds)} seconds`;
    const durationInMinutes = durationInSeconds / 60;
    return `${Math.round(durationInMinutes)} minutes`;
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
                      {event.logoutTime ? (
                         getDuration(event.loginTime, event.logoutTime)
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
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
