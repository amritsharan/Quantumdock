
'use client';

import { useEffect, useState } from 'react';
import { useUser, useDatabase } from '@/firebase';
import { ref, query, onValue, get, orderByChild } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type LoginEvent = {
  id: string;
  loginTime: number;
  logoutTime?: number;
  userEmail?: string;
};

type UserProfile = {
  isAdmin?: boolean;
  email?: string;
};

export default function HistoryPage() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const db = useDatabase();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (isUserAuthLoading || !db) {
      return; // Wait for auth and db to be ready
    }

    if (!user) {
      setIsLoading(false);
      setHistory([]);
      return;
    }

    // This effect will run once user/db status is resolved.
    const userProfileRef = ref(db, 'users/' + user.uid);
    let unsubscribe: () => void = () => {};

    get(userProfileRef).then(snapshot => {
      const profile = (snapshot.exists() ? snapshot.val() : {}) as UserProfile;
      const userIsAdmin = profile.isAdmin || false;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // --- Admin Data Fetching ---
        const loginHistoryRef = ref(db, 'loginHistory');
        const usersRef = ref(db, 'users');

        // Use `onValue` to listen for real-time updates for admins too
        unsubscribe = onValue(loginHistoryRef, async (historySnapshot) => {
          if (!historySnapshot.exists()) {
            setHistory([]);
            setIsLoading(false);
            return;
          }
          
          const usersSnapshot = await get(usersRef);
          const usersData = usersSnapshot.val() || {};
          const allHistory: LoginEvent[] = [];

          historySnapshot.forEach(userHistorySnapshot => {
            const userId = userHistorySnapshot.key;
            const userEmail = usersData[userId]?.email || 'Unknown';
            const events = userHistorySnapshot.val();
            Object.keys(events).forEach(key => {
              allHistory.push({
                id: `${userId}-${key}`,
                ...events[key],
                userEmail: userEmail,
              });
            });
          });

          setHistory(allHistory.sort((a, b) => b.loginTime - a.loginTime));
          setIsLoading(false);
        }, (error) => {
            console.error("Error fetching all user history:", error);
            setIsLoading(false);
        });

      } else {
        // --- Single User Data Fetching ---
        const historyQuery = query(ref(db, 'loginHistory/' + user.uid), orderByChild('loginTime'));
        unsubscribe = onValue(historyQuery, (snapshot) => {
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
      }
    });

    // Cleanup function for onValue listener
    return () => {
      unsubscribe();
    };
  }, [user, db, isUserAuthLoading]); // Effect depends on user and db availability
  
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
            {isAdmin 
              ? "Showing login history for all users." 
              : "Here is a list of your most recent login and logout times."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Email</TableHead>}
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {isAdmin && <TableCell><Skeleton className="h-5 w-40" /></TableCell>}
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
                  {isAdmin === true && <TableHead>Email</TableHead>}
                  <TableHead>Login Time</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((event) => (
                  <TableRow key={event.id}>
                    {isAdmin === true && <TableCell>{event.userEmail}</TableCell>}
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
