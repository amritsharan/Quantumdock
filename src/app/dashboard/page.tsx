
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { molecules as allMolecules, type Molecule } from '@/lib/molecules';
import { proteins as allProteins, type Protein } from '@/lib/proteins';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
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


function SimulationResultsDisplay({ results, title }: { results: Result[], title: string }) {
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                 <CardDescription>
                    Lower binding affinity (nM) indicates a stronger, more favorable interaction.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 && (
                    <div className="mb-8">
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
                )}
                <Accordion type="single" collapsible className="w-full">
                    {results.map((result, index) => (
                        <AccordionItem value={`item-${index}`} key={`${result.molecule.smiles}-${result.protein.name}`}>
                            <AccordionTrigger>
                                <div className="flex items-center gap-4 w-full">
                                    <div className="flex-1 text-left font-medium">{result.molecule.name} + {result.protein.name}</div>
                                    <Badge variant={result.status === 'complete' ? 'default' : (result.status === 'error' ? 'destructive' : 'secondary')} className={result.status === 'complete' ? 'bg-green-500' : ''}>
                                        {result.status}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {result.status === 'error' && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Simulation Failed</AlertTitle>
                                        <AlertDescription>{result.error || 'An unexpected error occurred.'}</AlertDescription>
                                    </Alert>
                                )}
                                {result.prediction && (
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                                        <div className="md:col-span-1 space-y-4">
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardDescription>Binding Affinity</CardDescription>
                                                    <CardTitle className="text-3xl">{result.prediction.bindingAffinity.toFixed(2)} nM</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-xs text-muted-foreground">Lower is better. Indicates stronger binding.</p>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader className="pb-2">
                                                    <CardDescription>Confidence Score</CardDescription>
                                                    <CardTitle className="text-3xl">{Math.round(result.prediction.confidenceScore * 100)}%</CardTitle>
                                                </CardHeader>
                                                 <CardContent>
                                                    <p className="text-xs text-muted-foreground">AI model's confidence in the prediction.</p>
                                                 </CardContent>
                                            </Card>
                                        </div>
                                        <div className="md:col-span-2 space-y-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>AI Rationale</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground">{result.prediction.rationale}</p>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader>
                                                    <CardTitle>Comparative Analysis</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                     <p className="text-sm text-muted-foreground mb-2"><strong>Standard Model Score:</strong> {result.prediction.comparison.standardModelScore.toFixed(2)} nM</p>
                                                    <p className="text-sm text-muted-foreground">{result.prediction.comparison.explanation}</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
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
            let retries = 3; // Number of retries
            
            while(retries > 0 && !success) {
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
                    
                    // Add a delay here to avoid hitting API rate limits
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
                    if (error.message && error.message.includes('429')) {
                        retries--;
                        const delay = 5000; // Wait 5 seconds before retrying
                        setCurrentStep(`[${i+1}/${totalSims}] Rate limit hit. Retrying in ${delay / 1000}s... (${retries} retries left)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        if(retries === 0) {
                            console.error(`Simulation failed for ${molecule.name} + ${protein.name}:`, error);
                            const errorMessage = "API rate limit exceeded after multiple retries. Please wait and try again later.";
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
                        }
                    } else {
                        // Non-retryable error
                        console.error(`Simulation failed for ${molecule.name} + ${protein.name}:`, error);
                        const errorMessage = error.message || 'An unexpected error occurred during AI prediction.';
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
                        retries = 0; // Stop retrying for this combination
                    }
                }
            }


            completedSims++;
            setTotalProgress(Math.round((completedSims / totalSims) * 100));
        }

        setCurrentStep('All simulations complete.');
        setIsRunning(false);
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
                        <CardTitle>Configuration</CardTitle>
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
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Visualisation</CardTitle>
                    </CardHeader>
                    <CardContent className="flex h-full min-h-[300px] items-start justify-center bg-muted/30 border-dashed -mt-6 rounded-b-lg p-6">
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
                                    <ScrollArea className="h-[calc(100vh-18rem)]">
                                        <SimulationResultsDisplay results={completedSimulations} title="Completed Simulations" />
                                    </ScrollArea>
                                </div>
                            ) : selectedMolecules.length > 0 ? (
                                <div className="w-full">
                                    <CardTitle className="mb-4">Selected Molecules</CardTitle>
                                    <ScrollArea className="h-[calc(100vh-22rem)]">
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
                                                        <div className="text-center">
                                                            <p className="text-sm font-mono">{molecule.formula}</p>
                                                            <p className="text-xs text-muted-foreground">{molecule.molecularWeight.toFixed(2)} g/mol</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
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

    