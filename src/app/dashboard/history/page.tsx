
'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collectionGroup, query, orderBy, limit, getDocs, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';

type LoginEvent = {
  id: string;
  loginTime: number;
  logoutTime?: number;
  userEmail?: string;
  userId?: string;
};

type UserProfile = {
  isAdmin?: boolean;
  email?: string;
};

const MAX_HISTORY_ITEMS = 50;

export default function HistoryPage() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (isUserAuthLoading || !firestore) {
      return; // Wait for auth and db to be ready
    }

    if (!user) {
      setIsLoading(false);
      setHistory([]);
      return;
    }

    const userProfileRef = doc(firestore, 'users', user.uid);

    getDoc(userProfileRef).then(async (userDoc) => {
      const profile = (userDoc.exists() ? userDoc.data() : {}) as UserProfile;
      const userIsAdmin = profile.isAdmin || false;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // --- Admin Data Fetching ---
        const loginHistoryQuery = query(
          collectionGroup(firestore, 'loginHistory'), 
          orderBy('loginTime', 'desc'), 
          limit(MAX_HISTORY_ITEMS)
        );
        
        const historySnapshot = await getDocs(loginHistoryQuery);

        const usersCache = new Map<string, string>();
        const allHistory: LoginEvent[] = [];

        for (const historyDoc of historySnapshot.docs) {
          const eventData = historyDoc.data();
          const userId = historyDoc.ref.parent.parent?.id; // Get userId from path 'users/{userId}/loginHistory/{docId}'

          if (!userId) continue;

          let userEmail = usersCache.get(userId);
          if (!userEmail) {
            const userRef = doc(firestore, 'users', userId);
            const fetchedUserDoc = await getDoc(userRef);
            if (fetchedUserDoc.exists()) {
              userEmail = fetchedUserDoc.data().email || 'Unknown';
              usersCache.set(userId, userEmail);
            } else {
              userEmail = 'Unknown';
            }
          }

          allHistory.push({
            id: historyDoc.id,
            loginTime: eventData.loginTime,
            logoutTime: eventData.logoutTime,
            userEmail: userEmail,
            userId: userId,
          });
        }
        
        setHistory(allHistory);
        setIsLoading(false);

      } else {
         // Non-admins don't see history for now
         setHistory([]);
         setIsLoading(false);
      }
    }).catch(error => {
        console.error("Error fetching user profile or history:", error);
        setIsLoading(false);
    });

  }, [user, firestore, isUserAuthLoading]);
  
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
              ? `Showing the last ${MAX_HISTORY_ITEMS} login events for all users.` 
              : 'Login history is available for administrators.'
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
          ) : history.length > 0 && isAdmin ? (
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
              {isAdmin ? 'No login history found.' : 'You do not have permission to view login history.'}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
