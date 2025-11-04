
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { molecules } from '@/lib/molecules';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


type LoginHistory = {
  id: string;
  loginTime: { seconds: number; nanoseconds: number };
  logoutTime?: { seconds: number; nanoseconds: number };
  status: 'active' | 'inactive';
  duration?: number;
  userId: string;
};

type DockingSimulation = {
    moleculeSmiles: string;
    proteinTarget: string;
    bindingAffinity: number;
    timestamp: Timestamp;
};

const calculateActiveDuration = (loginDate: Date) => {
    return `${formatDistanceToNow(loginDate)} (so far)`;
};

function DailyActivityDialog({ loginRecord, isOpen, onOpenChange }: { loginRecord: WithId<LoginHistory> | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const firestore = useFirestore();
    const userId = loginRecord?.userId;
    const historyId = loginRecord?.id;
    
    const simulationsQuery = useMemoFirebase(() => {
        if (!firestore || !userId || !historyId) return null;
        
        return query(
            collection(firestore, 'users', userId, 'loginHistory', historyId, 'dockingSimulations'),
            orderBy('timestamp', 'desc')
        );
    }, [firestore, userId, historyId]);

    const { data: simulations, isLoading } = useCollection<DockingSimulation>(simulationsQuery);

    const getMoleculeName = (smiles: string) => {
        return molecules.find(m => m.smiles === smiles)?.name || 'Unknown';
    }

    const handleDownloadPdf = () => {
        if (!loginRecord?.loginTime) return;

        const date = new Date(loginRecord.loginTime.seconds * 1000);
        const doc = new jsPDF();
        const docTitle = `Docking Activity for ${format(date, 'PPP')}`;
        
        doc.setFontSize(18);
        doc.text(docTitle, 14, 22);

        if (!simulations || simulations.length === 0) {
            doc.setFontSize(12);
            doc.text("No docking simulations were performed during this session.", 14, 40);
        } else {
            const tableColumn = ["Time", "Molecule", "Protein Target", "Binding Affinity (nM)"];
            const tableRows: any[][] = [];

            simulations.forEach(sim => {
                const simData = [
                    format(sim.timestamp.toDate(), 'p'),
                    getMoleculeName(sim.moleculeSmiles),
                    sim.proteinTarget,
                    sim.bindingAffinity.toFixed(2),
                ];
                tableRows.push(simData);
            });

            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 30,
                theme: 'striped',
                headStyles: { fillColor: [46, 82, 102] }
            });
        }
        
        doc.save(`QuantumDock_Activity_${format(date, 'yyyy-MM-dd_HH-mm')}.pdf`);
    };

    const date = loginRecord ? new Date(loginRecord.loginTime.seconds * 1000) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                         <div>
                            <DialogTitle>Activity for Session Started at {date ? format(date, 'Pp') : ''}</DialogTitle>
                            <DialogDescription>
                                A log of docking simulations performed during this login session.
                            </DialogDescription>
                         </div>
                         <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" /> }
                            Download PDF
                        </Button>
                    </div>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!isLoading && (!simulations || simulations.length === 0) && (
                         <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No simulations found for this session.</p>
                        </div>
                    )}
                    {!isLoading && simulations && simulations.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Molecule</TableHead>
                                    <TableHead>Protein</TableHead>
                                    <TableHead className="text-right">Affinity (nM)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {simulations.map(sim => (
                                    <TableRow key={sim.id}>
                                        <TableCell>{format(sim.timestamp.toDate(), 'p')}</TableCell>
                                        <TableCell>{getMoleculeName(sim.moleculeSmiles)}</TableCell>
                                        <TableCell>{sim.proteinTarget}</TableCell>
                                        <TableCell className="text-right">{sim.bindingAffinity.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedLoginRecord, setSelectedLoginRecord] = useState<WithId<LoginHistory> | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  
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
    // Set the current time only on the client, after hydration
    setCurrentTime(new Date());

    // This timer updates the "active" session's duration every minute.
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const formattedHistory = useMemo(() => {
    if (!currentTime || !allHistory) return null; // Don't compute until client has mounted
    
    return allHistory?.map((item) => {
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
  }, [allHistory, currentTime]);

  const handleLoginTimeClick = (record: WithId<LoginHistory> | null) => {
      if (!record) return;
      setSelectedLoginRecord(record);
      setIsActivityDialogOpen(true);
  }

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
              {(isLoading || !formattedHistory) && !error && renderSkeleton()}
              {error && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive">
                        Error loading history: Insufficient permissions.
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && formattedHistory?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No login history found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error &&
                formattedHistory?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell 
                      className="cursor-pointer font-medium text-primary hover:underline"
                      onClick={() => handleLoginTimeClick(item)}
                    >
                        {item.loginTimeFormatted}
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
      <DailyActivityDialog 
        loginRecord={selectedLoginRecord}
        isOpen={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      />
    </main>
  );
}

    