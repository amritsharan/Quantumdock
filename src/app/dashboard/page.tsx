
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { molecules as allMolecules, type Molecule } from '@/lib/molecules';
import { proteins as allProteins, type Protein } from '@/lib/proteins';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Save, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType } from 'docx';
import { saveAs } from 'file-saver';


type SimulationStatus = 'idle' | 'preparing' | 'simulating' | 'analyzing' | 'complete' | 'error';
type SimulationStep = 'preparing' | 'classifying' | 'docking' | 'refining' | 'predicting' | 'done';

type Result = {
    molecule: Molecule;
    protein: Protein;
    status: SimulationStatus;
    step: SimulationStep;
    progress: number;
    refinedEnergy: number | null;
    prediction: any | null;
    error?: string;
};

// A simple deterministic hash function for pseudo-random number generation
const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

const getAffinityLevel = (affinity: number): { level: 'High' | 'Moderate' | 'Low', className: string } => {
    if (affinity < 10) return { level: 'High', className: 'bg-green-500 hover:bg-green-500/80' };
    if (affinity <= 100) return { level: 'Moderate', className: 'bg-yellow-500 hover:bg-yellow-500/80' };
    return { level: 'Low', className: 'bg-red-500 hover:bg-red-500/80' };
};


function SimulationResultsDisplay({ results, title, onSaveResults, isSaving }: { results: Result[], title: string, onSaveResults: () => void, isSaving: boolean }) {
    const chartData = useMemo(() => {
        return results
            .filter(r => r.status === 'complete' && r.prediction)
            .map(r => ({
                name: `${r.molecule.name.substring(0, 10)}... + ${r.protein.name.substring(0, 10)}...`,
                bindingAffinity: r.prediction.bindingAffinity,
            }))
            .sort((a, b) => a.bindingAffinity - b.bindingAffinity); // Sort for better visualization
    }, [results]);

    const chartConfig = {
        bindingAffinity: {
            label: "Binding Affinity (nM)",
            color: "hsl(var(--accent))",
        },
    };

    const completedResults = results.filter(r => r.status === 'complete' && r.prediction);
    const erroredResults = results.filter(r => r.status === 'error');

    const handleDownloadPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const docTitle = "QuantumDock - Detailed Simulation Results";

        doc.setFontSize(18);
        doc.text(docTitle, 14, 22);

        let lastY = 30;

        if (chartData.length > 0) {
            const chartElement = (document.querySelector('[data-testid="chart-container"]') as HTMLElement);
            if (chartElement) {
                // Temporarily make the chart visible for rendering if it's not
                const canvas = chartElement.querySelector('canvas');
                 if (canvas) {
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    doc.setFontSize(14);
                    doc.text("Binding Affinity Comparison", 14, lastY);
                    lastY += 10;
                    // Adjust image size to fit landscape mode
                    const imgProps = doc.getImageProperties(imgData);
                    const pdfWidth = doc.internal.pageSize.getWidth() - 28;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    doc.addImage(imgData, 'PNG', 14, lastY, pdfWidth, pdfHeight);
                    lastY += pdfHeight + 10;
                }
            }
        }
        
        doc.setFontSize(14);
        doc.text("Detailed Simulation Results", 14, lastY);
        lastY += 10;


        const mainTableColumn = ["Combination", "Refined Energy (kcal/mol)", "Quantum Affinity (nM)", "Confidence", "GNN Model (nM)", "Explanation", "Affinity Level"];
        const mainTableRows: any[][] = [];

        completedResults.forEach(res => {
            const rowData = [
                `${res.molecule.name} + ${res.protein.name}`,
                res.refinedEnergy?.toFixed(2) ?? 'N/A',
                res.prediction.bindingAffinity.toFixed(2),
                `${Math.round(res.prediction.confidenceScore * 100)}%`,
                res.prediction.comparison.gnnModelScore.toFixed(2),
                res.prediction.comparison.explanation,
                getAffinityLevel(res.prediction.bindingAffinity).level,
            ];
            mainTableRows.push(rowData);
        });

        if (mainTableRows.length > 0) {
            (doc as any).autoTable({
                head: [mainTableColumn],
                body: mainTableRows,
                startY: lastY,
                theme: 'striped',
                headStyles: { fillColor: [46, 82, 102] },
                columnStyles: { 5: { cellWidth: 70 } } // Wrap text in explanation column
            });
            lastY = (doc as any).lastAutoTable.finalY + 15;
        } else {
             doc.setFontSize(12);
             doc.text("No completed simulation data to export.", 14, lastY);
             lastY += 10;
        }
        
        doc.setFontSize(14);
        doc.text("Molecular Properties", 14, lastY);
        lastY += 10;
        
        const propertiesTableColumn = ["Combination", "Comb. MW (Da)", "H-Donors", "H-Acceptors"];
        const propertiesTableRows: any[][] = [];

        completedResults.forEach(res => {
            const rowData = [
                 `${res.molecule.name} + ${res.protein.name}`,
                 (res.molecule.molecularWeight + res.protein.molecularWeight).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                 res.molecule.donors,
                 res.molecule.acceptors
            ];
            propertiesTableRows.push(rowData);
        });
        
         if (propertiesTableRows.length > 0) {
            (doc as any).autoTable({
                head: [propertiesTableColumn],
                body: propertiesTableRows,
                startY: lastY,
                theme: 'striped',
                headStyles: { fillColor: [46, 82, 102] }
            });
             lastY = (doc as any).lastAutoTable.finalY + 15;
        }
        
        doc.setFontSize(14);
        doc.text("Performance Comparison", 14, lastY);
        lastY += 10;

        const timingTableColumn = ["Combination", "Quantum Model Time (s)", "GNN Model Time (s)"];
        const timingTableRows: any[][] = [];

        completedResults.forEach(res => {
            const rowData = [
                 `${res.molecule.name} + ${res.protein.name}`,
                 res.prediction.timing.quantumModelTime.toFixed(2),
                 res.prediction.timing.gnnModelTime.toFixed(2),
            ];
            timingTableRows.push(rowData);
        });

        if (timingTableRows.length > 0) {
            (doc as any).autoTable({
                head: [timingTableColumn],
                body: timingTableRows,
                startY: lastY,
                theme: 'grid',
                headStyles: { fillColor: [46, 82, 102] }
            });
        }


        doc.save(`QuantumDock_Results_${new Date().toISOString()}.pdf`);
    };
    
    const handleDownloadDocx = () => {
        if (completedResults.length === 0) {
            alert("No completed simulation data to export.");
            return;
        }

        const tableHeader = new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph({ text: "Combination", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Refined Energy (kcal/mol)", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Quantum Affinity (nM)", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Confidence", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "GNN Model (nM)", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Explanation", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Affinity Level", bold: true })] }),
            ],
        });

        const tableRows = completedResults.map(res => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(`${res.molecule.name} + ${res.protein.name}`)] }),
                new DocxTableCell({ children: [new Paragraph(res.refinedEnergy?.toFixed(2) ?? 'N/A')] }),
                new DocxTableCell({ children: [new Paragraph(res.prediction.bindingAffinity.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(`${Math.round(res.prediction.confidenceScore * 100)}%`)] }),
                new DocxTableCell({ children: [new Paragraph(res.prediction.comparison.gnnModelScore.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(res.prediction.comparison.explanation)] }),
                new DocxTableCell({ children: [new Paragraph(getAffinityLevel(res.prediction.bindingAffinity).level)] }),
            ],
        }));

        const mainTable = new DocxTable({
            rows: [tableHeader, ...tableRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });

        const propertiesHeader = new DocxTableRow({
            children: [
                 new DocxTableCell({ children: [new Paragraph({ text: "Combination", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Combined MW (Da)", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "H-Donors", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "H-Acceptors", bold: true })] }),
            ]
        });

         const propertiesRows = completedResults.map(res => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(`${res.molecule.name} + ${res.protein.name}`)] }),
                new DocxTableCell({ children: [new Paragraph((res.molecule.molecularWeight + res.protein.molecularWeight).toLocaleString(undefined, { maximumFractionDigits: 2 }))] }),
                new DocxTableCell({ children: [new Paragraph(String(res.molecule.donors))] }),
                new DocxTableCell({ children: [new Paragraph(String(res.molecule.acceptors))] }),
            ]
        }));

        const propertiesTable = new DocxTable({
            rows: [propertiesHeader, ...propertiesRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });
        
        const timingHeader = new DocxTableRow({
            children: [
                 new DocxTableCell({ children: [new Paragraph({ text: "Combination", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Quantum Model Time (s)", bold: true })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "GNN Model Time (s)", bold: true })] }),
            ]
        });

        const timingRows = completedResults.map(res => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(`${res.molecule.name} + ${res.protein.name}`)] }),
                new DocxTableCell({ children: [new Paragraph(res.prediction.timing.quantumModelTime.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(res.prediction.timing.gnnModelTime.toFixed(2))] }),
            ]
        }));
        
        const timingTable = new DocxTable({
            rows: [timingHeader, ...timingRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: "QuantumDock - Detailed Simulation Results", bold: true, size: 36 })],
                    }),
                    new Paragraph({ children: [new TextRun({ text: "Molecular Properties", bold: true, size: 28 })] }),
                    propertiesTable,
                    new Paragraph({ text: "", spacing: { after: 200 } }),
                    new Paragraph({ children: [new TextRun({ text: "Binding Affinity Comparison", bold: true, size: 28 })] }),
                    mainTable,
                    new Paragraph({ text: "", spacing: { after: 200 } }), // Add some space
                    new Paragraph({ children: [new TextRun({ text: "Performance Comparison", bold: true, size: 28 })] }),
                    timingTable,
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `QuantumDock_Results_${new Date().toISOString()}.docx`);
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>
                                Lower binding affinity (nM) indicates a stronger, more favorable interaction.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={completedResults.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadDocx} disabled={completedResults.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> DOCX
                            </Button>
                            <Button variant="default" size="sm" onClick={onSaveResults} disabled={completedResults.length === 0 || isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Results
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                     {completedResults.length > 0 && (
                        <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Molecular Properties</CardTitle>
                                <CardDescription>
                                    Combined properties of the simulated molecule-protein pairs.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Combination</TableHead>
                                                <TableHead>Comb. MW (Da)</TableHead>
                                                <TableHead>H-Donors</TableHead>
                                                <TableHead>H-Acceptors</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {completedResults.map((result, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">
                                                        <div>{result.molecule.name}</div>
                                                        <div className="text-xs text-muted-foreground">+ {result.protein.name}</div>
                                                    </TableCell>
                                                    <TableCell>{(result.molecule.molecularWeight + result.protein.molecularWeight).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell>{result.molecule.donors}</TableCell>
                                                    <TableCell>{result.molecule.acceptors}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div data-testid="chart-container">
                            <CardTitle className="text-lg mb-4">Binding Affinity Comparison</CardTitle>
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <ResponsiveContainer>
                                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                            fontSize={10}
                                        />
                                        <YAxis
                                            label={{ value: 'Binding Affinity (nM)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar dataKey="bindingAffinity" fill="var(--color-bindingAffinity)" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        </>
                    )}
                    
                    <div>
                        <CardTitle className="text-lg mb-4">Detailed Simulation Results</CardTitle>
                         {(completedResults.length === 0 && erroredResults.length === 0) ? (
                            <div className="rounded-md border h-24 flex items-center justify-center text-sm text-muted-foreground">
                                No results yet. Run a simulation to see the output.
                            </div>
                        ) : (
                             <Accordion type="single" collapsible className="w-full">
                                <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 font-medium text-muted-foreground text-sm border-b">
                                    <div className="col-span-3">Combination</div>
                                    <div className="col-span-2">Refined Energy (kcal/mol)</div>
                                    <div className="col-span-2">Quantum Affinity (nM)</div>
                                    <div className="col-span-2">Confidence</div>
                                    <div className="col-span-2 text-right">Affinity Level</div>
                                    <div className="col-span-1"></div> {/* For accordion chevron */}
                                </div>
                                {completedResults.map((result, index) => {
                                    const affinityInfo = getAffinityLevel(result.prediction.bindingAffinity);
                                    return (
                                        <AccordionItem value={`item-${index}`} key={index}>
                                            <AccordionTrigger className="grid sm:grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 hover:no-underline rounded-md">
                                                <div className="col-span-11 sm:col-span-3 text-left">
                                                     <div className="font-medium">{result.molecule.name}</div>
                                                     <div className="text-xs text-muted-foreground">+ {result.protein.name}</div>
                                                </div>
                                                <div className="col-span-11 sm:col-span-2 text-left font-semibold">{result.refinedEnergy?.toFixed(2)}</div>
                                                <div className="col-span-11 sm:col-span-2 text-left font-semibold">{result.prediction.bindingAffinity.toFixed(2)}</div>
                                                <div className="col-span-11 sm:col-span-2 text-left">{Math.round(result.prediction.confidenceScore * 100)}%</div>
                                                <div className="col-span-11 sm:col-span-2 text-right">
                                                     <Badge variant="default" className={affinityInfo.className}>
                                                        {affinityInfo.level}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 py-2 bg-muted/30 rounded-b-md space-y-4">
                                                <div>
                                                    <h4 className="font-semibold mb-1">AI vs. GNN Model</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                         <div>
                                                            <div className="text-muted-foreground">GNN Model Affinity</div>
                                                            <div className="font-semibold">{result.prediction.comparison.gnnModelScore.toFixed(2)} nM</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground">Explanation</div>
                                                            <p className="text-xs text-muted-foreground">{result.prediction.comparison.explanation}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Separator />
                                                <div>
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Performance Comparison</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <div className="text-muted-foreground">Quantum Model Time</div>
                                                            <div className="font-semibold">{result.prediction.timing.quantumModelTime.toFixed(2)}s</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted-foreground">GNN Model Time</div>
                                                            <div className="font-semibold">{result.prediction.timing.gnnModelTime.toFixed(2)}s</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                                 {erroredResults.map((result, index) => (
                                    <div key={`error-${index}`} className="grid sm:grid-cols-12 gap-4 px-4 py-3 border-b">
                                        <div className="col-span-3 font-medium">
                                            <div>{result.molecule.name}</div>
                                            <div className="text-xs text-muted-foreground">+ {result.protein.name}</div>
                                        </div>
                                        <div className="col-span-9">
                                            <Alert variant="destructive" className="bg-transparent border-0 p-0">
                                                <AlertDescription>{result.error}</AlertDescription>
                                            </Alert>
                                        </div>
                                    </div>
                                ))}
                             </Accordion>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const [selectedMolecules, setSelectedMolecules] = useState<Molecule[]>([]);
    const [selectedProteins, setSelectedProteins] = useState<Protein[]>([]);
    const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
    
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [simulationResults, setSimulationResults] = useState<Result[]>([]);
    const [completedSimulations, setCompletedSimulations] = useState<Result[]>([]);
    const [currentStep, setCurrentStep] = useState<string>('Not started');
    const [totalProgress, setTotalProgress] = useState(0);

    const smilesParam = searchParams.get('smiles');
    const proteinsParam = searchParams.get('proteins');
    const diseasesParam = searchParams.get('diseases');

    useEffect(() => {
        if (smilesParam) {
            try {
                const smilesArray = JSON.parse(smilesParam);
                const mols = allMolecules.filter(m => smilesArray.includes(m.smiles));
                setSelectedMolecules(mols);
            } catch {
                setSelectedMolecules([]);
            }
        }
    }, [smilesParam]);

    useEffect(() => {
        if (proteinsParam) {
            try {
                const proteinArray = JSON.parse(proteinsParam);
                const prots = allProteins.filter(p => proteinArray.includes(p.name));
                setSelectedProteins(prots);
            } catch {
                setSelectedProteins([]);
            }
        }
    }, [proteinsParam]);

    useEffect(() => {
        if (diseasesParam) {
            try {
                setSelectedDiseases(JSON.parse(diseasesParam));
            } catch {
                setSelectedDiseases([]);
            }
        }
    }, [diseasesParam]);

     const runSimulation = async () => {
        if (selectedMolecules.length === 0 || selectedProteins.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Selection missing',
                description: 'Please select at least one molecule and one protein target.',
            });
            return;
        }
         if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'User not authenticated or Firestore is not available.',
            });
            return;
        }

        setIsRunning(true);
        setSimulationResults([]);
        setCompletedSimulations([]);
        setTotalProgress(0);
        
        const combinations = selectedMolecules.flatMap(mol => selectedProteins.map(prot => ({ molecule: mol, protein: prot })));
        const totalSims = combinations.length;
        let completedSims = 0;

        const initialResults: Result[] = combinations.map(c => ({
            ...c,
            status: 'preparing',
            step: 'preparing',
            progress: 0,
            refinedEnergy: null,
            prediction: null,
        }));

        setSimulationResults(initialResults);

        for (let i = 0; i < combinations.length; i++) {
            const { molecule, protein } = combinations[i];
            const updateResult = (update: Partial<Result>) => {
                setSimulationResults(prev => prev.map((r, idx) => idx === i ? { ...r, ...update } : r));
            };

            let prediction;
            let success = false;
            let attempt = 0;
            const maxRetries = 3;
            
            while(attempt < maxRetries && !success) {
                try {
                    // Step 1: Simulate Quantum Refinement
                    updateResult({ status: 'simulating', step: 'refining', progress: 25 });
                    setCurrentStep(`[${i+1}/${totalSims}] Refining energy for ${molecule.name} + ${protein.name}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)); // Simulate async work
                    
                    const seed = simpleHash(`${molecule.smiles}${protein.name}`);
                    const pseudoRandom = () => {
                        let state = seed;
                        return () => {
                            let x = Math.sin(state++) * 10000;
                            return x - Math.floor(x);
                        };
                    };
                    const random = pseudoRandom();
                    const refinedEnergy = -12.0 + (random() * 6.0 - 3.0);
                    
                    updateResult({ refinedEnergy, progress: 50 });

                    // Step 2: AI-powered Prediction
                    updateResult({ status: 'analyzing', step: 'predicting', progress: 75 });
                    setCurrentStep(`[${i+1}/${totalSims}] Predicting affinity for ${molecule.name} + ${protein.name}`);
                    
                    // Add a proactive delay here to avoid hitting API rate limits.
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    

                    prediction = await predictBindingAffinities({
                        quantumRefinedEnergy: refinedEnergy,
                        moleculeSmiles: molecule.smiles,
                        proteinTargetName: protein.name,
                    });
                    
                    success = true; // Mark as successful if no error was thrown
                    
                    updateResult({ prediction, status: 'complete', step: 'done', progress: 100 });
                    
                    // Log to Firestore
                     if (user && firestore) {
                        try {
                            const historyCollectionRef = collection(firestore, 'users', user.uid, 'loginHistory');
                            const q = query(historyCollectionRef, where('status', '==', 'active'), orderBy('loginTime', 'desc'), limit(1));
                            const querySnapshot = await getDocs(q);

                            if (!querySnapshot.empty) {
                                const activeSessionRef = querySnapshot.docs[0].ref;
                                const simulationsCollectionRef = collection(activeSessionRef, 'dockingSimulations');
                                await addDoc(simulationsCollectionRef, {
                                    userId: user.uid,
                                    timestamp: serverTimestamp(),
                                    moleculeSmiles: molecule.smiles,
                                    proteinTarget: protein.name,
                                    bindingAffinity: prediction.bindingAffinity,
                                });
                            }
                        } catch (e: any) {
                             // A permission error here is not critical to the UI flow,
                             // so we'll just toast it instead of throwing a global error.
                             toast({
                                variant: "destructive",
                                title: "Could not save simulation history",
                                description: "Please check your Firestore security rules.",
                             });
                        }
                    }

                     // Move to completed
                     setCompletedSimulations(prev => [...prev, {
                        molecule,
                        protein,
                        status: 'complete',
                        step: 'done',
                        progress: 100,
                        refinedEnergy,
                        prediction,
                    }]);

                } catch (error: any) {
                     attempt++;
                     const isRetryableError = error.message && (
                        error.message.includes('429') || 
                        error.message.includes('Too Many Requests') ||
                        error.message.includes('503') ||
                        error.message.includes('Service Unavailable')
                    );

                    if (isRetryableError && attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
                        const retryMessage = error.message.includes('429') ? 'Rate limit hit' : 'Service unavailable';
                        setCurrentStep(`[${i+1}/${totalSims}] ${retryMessage}. Retrying in ${delay / 1000}s... (${maxRetries - attempt} retries left)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Non-retryable error or retries exhausted
                        console.error(`Simulation failed for ${molecule.name} + ${protein.name}:`, error);
                        const errorMessage = isRetryableError 
                            ? "API is overloaded. Please wait and try again later."
                            : error.message || 'An unexpected error occurred during AI prediction.';

                        updateResult({ status: 'error', error: errorMessage, progress: 100 });
                        setCompletedSimulations(prev => [...prev, {
                            molecule,
                            protein,
                            status: 'error',
                            step: 'done',
                            progress: 100,
                            error: errorMessage,
                            refinedEnergy: null,
                            prediction: null,
                        }]);
                        // This break will exit the while loop for the current combination
                        break;
                    }
                }
            }


            completedSims++;
            setTotalProgress(Math.round((completedSims / totalSims) * 100));
        }

        setCurrentStep('All simulations complete.');
        setIsRunning(false);
    };

    const handleSaveResults = async () => {
        if (!user || !firestore || completedSimulations.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Cannot Save Results',
                description: 'There are no completed simulation results to save, or user is not logged in.',
            });
            return;
        }

        setIsSaving(true);
        try {
            const resultsToSave = completedSimulations
                .filter(r => r.status === 'complete' && r.prediction)
                .map(r => ({
                    moleculeId: r.molecule.smiles, // Using SMILES as a proxy for ID
                    targetProteinId: r.protein.name,
                    dockingScore: -1, // Placeholder as we don't have a classical score
                    refinedEnergy: r.refinedEnergy,
                    pose: 'N/A', // Placeholder
                    bindingAffinity: r.prediction.bindingAffinity,
                    userId: user.uid,
                }));

            if (resultsToSave.length > 0) {
                const dockingResultRef = collection(firestore, 'users', user.uid, 'dockingResults');
                for (const result of resultsToSave) {
                     await addDoc(dockingResultRef, {
                        ...result,
                        createdAt: serverTimestamp(),
                     });
                }
            }

            toast({
                title: 'Results Saved',
                description: `Successfully saved ${resultsToSave.length} docking results to your profile.`,
            });

        } catch (error: any) {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: `users/${user.uid}/dockingResults`,
                    operation: 'create',
                    requestResourceData: { results: '...' }
                })
            );
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Could not save docking results. You may not have the required permissions.',
            });
        } finally {
            setIsSaving(false);
        }
    };


    const buildQueryString = (param: string, value: any[]) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value.length > 0) {
            params.set(param, JSON.stringify(value));
        } else {
            params.delete(param);
        }
        return params.toString();
    };

    const moleculeSmiles = useMemo(() => selectedMolecules.map(m => m.smiles), [selectedMolecules]);
    const proteinNames = useMemo(() => selectedProteins.map(p => p.name), [selectedProteins]);
    
    const moleculeQueryString = buildQueryString('smiles', moleculeSmiles);
    const proteinQueryString = buildQueryString('proteins', proteinNames);
    const diseaseQueryString = buildQueryString('diseases', selectedDiseases);


    return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-3">
             <div className="md:col-span-1 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Molecule Viewer</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold">Molecules</h3>
                            <Card className="p-4">
                                {selectedMolecules.length > 0 ? (
                                    <ScrollArea className="h-24">
                                        <div className="space-y-3">
                                            {selectedMolecules.map(m => (
                                                <div key={m.smiles} className="text-sm">
                                                    <p className="font-medium">{m.name}</p>
                                                     <p className="text-xs text-muted-foreground">
                                                        {m.formula} &bull; {m.molecularWeight.toFixed(2)} g/mol
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No molecules selected.
                                    </div>
                                )}
                            </Card>
                            <Button asChild variant="outline" size="sm" className="w-full">
                                <Link href={`/select-molecule?${proteinQueryString}&${diseaseQueryString}`}>
                                    Molecules selection
                                </Link>
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="font-semibold">Select Diseases</h3>
                            <Card className="p-4">
                                {selectedDiseases.length > 0 ? (
                                    <ScrollArea className="h-24">
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDiseases.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No diseases for suggestions.
                                    </div>
                                )}
                            </Card>
                            <Button asChild variant="outline" size="sm" className="w-full">
                                <Link href={`/select-disease?${moleculeQueryString}&${proteinQueryString}`}>
                                    Disease selection
                                </Link>
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="font-semibold">Protein Targets</h3>
                            <Card className="p-4">
                                {selectedProteins.length > 0 ? (
                                    <ScrollArea className="h-24">
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            {selectedProteins.map(p => <li key={p.name}>{p.name}</li>)}
                                        </ul>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No proteins selected.
                                    </div>
                                )}
                            </Card>
                             <Button asChild variant="outline" size="sm" className="w-full">
                                <Link href={`/select-protein?${moleculeQueryString}&${diseaseQueryString}`}>
                                    Target selection
                                </Link>
                            </Button>
                        </div>
                        
                         <Button onClick={runSimulation} disabled={isRunning || selectedMolecules.length === 0 || selectedProteins.length === 0}>
                            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Run docking for ({selectedMolecules.length * selectedProteins.length}) combinations
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Visualisation</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-start justify-start bg-muted/30 border-dashed -mt-6 rounded-b-lg p-6">
                         {isRunning ? (
                            <div className="w-full p-6 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground text-center">{currentStep}</p>
                                    <Progress value={totalProgress} />
                                </div>
                                <ScrollArea className="h-[calc(100vh-28rem)]">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {simulationResults.map((result, index) => (
                                        <Card key={index}>
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <CardTitle className="text-sm font-medium">{result.molecule.name} + {result.protein.name}</CardTitle>
                                                {result.status === 'simulating' || result.status === 'analyzing' || result.status === 'preparing' ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                ) : null}
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex justify-center my-2">
                                                    <Image
                                                        src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(result.molecule.smiles)}/image?width=100&height=100`}
                                                        alt={`Structure of ${result.molecule.name}`}
                                                        width={100}
                                                        height={100}
                                                        className="rounded-md bg-white p-2 border"
                                                        unoptimized
                                                    />
                                                </div>
                                                <div className="text-xs text-muted-foreground capitalize text-center">{result.step}...</div>
                                                <Progress value={result.progress} className="mt-2 h-2" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                </ScrollArea>
                            </div>
                        ) : completedSimulations.length > 0 ? (
                                <div className="w-full">
                                    <SimulationResultsDisplay 
                                        results={completedSimulations}
                                        title="Completed Simulations"
                                        onSaveResults={handleSaveResults}
                                        isSaving={isSaving}
                                    />
                                </div>
                            ) : selectedMolecules.length > 0 ? (
                                <div className="w-full">
                                    <CardTitle className="mb-4">Selected Molecules</CardTitle>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {selectedMolecules.map(molecule => (
                                                <Card key={molecule.smiles}>
                                                    <CardHeader>
                                                        <CardTitle className="text-base">{molecule.name}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="flex flex-col items-center gap-2">
                                                         <Image
                                                            src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(molecule.smiles)}/image?width=150&height=150`}
                                                            alt={`Structure of ${molecule.name}`}
                                                            width={150}
                                                            height={150}
                                                            className="rounded-md bg-white p-2 border"
                                                            unoptimized
                                                        />
                                                        <div className="text-left w-full text-xs space-y-1">
                                                            <p><span className="font-semibold">Molecular Formula:</span> <span className="font-mono">{molecule.formula}</span></p>
                                                            <p><span className="font-semibold">Molecular Weight:</span> {molecule.molecularWeight.toFixed(2)} g/mol</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground m-auto">
                                    <p>Select molecules and proteins, then run the simulation.</p>
                                    <p>Results will appear here.</p>
                                </div>
                            )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
      <Toaster />
    </>
  );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardPage />
        </Suspense>
    )
}

    