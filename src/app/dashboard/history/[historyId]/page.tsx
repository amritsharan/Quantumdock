
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useCollection, type WithId, useDoc } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
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

function SessionActivityPage({ params }: { params: { historyId: string } }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const userId = user?.uid;
    const { historyId } = params;
    
    const loginRecordRef = useMemoFirebase(() => {
        if (!firestore || !userId || !historyId) return null;
        return doc(firestore, 'users', userId, 'loginHistory', historyId);
    }, [firestore, userId, historyId]);

    const { data: loginRecord, isLoading: isLoadingRecord } = useDoc<LoginHistory>(loginRecordRef);

    const simulationsQuery = useMemoFirebase(() => {
        if (!firestore || !userId || !historyId) return null;
        
        return query(
            collection(firestore, 'users', userId, 'loginHistory', historyId, 'dockingSimulations'),
            orderBy('timestamp', 'desc')
        );
    }, [firestore, userId, historyId]);

    const { data: simulations, isLoading: isLoadingSimulations } = useCollection<DockingSimulation>(simulationsQuery);

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
    
    const date = loginRecord?.loginTime ? new Date(loginRecord.loginTime.seconds * 1000) : null;

    const isLoading = isLoadingRecord || isLoadingSimulations;

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Activity for Session</CardTitle>
                        <CardDescription>
                            {date ? `Started at ${format(date, 'Pp')}` : 'Loading session details...'}
                        </CardDescription>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={isLoading || !simulations || simulations.length === 0}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" /> }
                            Download PDF
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/dashboard/history">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to History
                            </Link>
                        </Button>
                     </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] pr-4">
                        {isLoading && (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!isLoading && (!simulations || simulations.length === 0) && (
                             <div className="flex h-full items-center justify-center">
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
                </CardContent>
            </Card>
        </main>
    );
}

export default SessionActivityPage;
