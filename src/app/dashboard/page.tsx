
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { molecules as allMolecules, type Molecule } from '@/lib/molecules';
import { proteins as allProteins, type Protein } from '@/lib/proteins';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Beaker, Dna, FileText, Loader2, Play, Settings, Bot } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// Helper to generate a deterministic but seemingly random energy value
const generateRefinedEnergy = (smiles: string, proteinName: string): number => {
    const charCodes = (smiles + proteinName).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const random = Math.sin(charCodes) * 10000;
    const value = -12 + (random - Math.floor(random)) * 6; // Range: -12 to -6
    return parseFloat(value.toFixed(2));
};

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

function SimulationResultsDisplay({ results, title }: { results: Result[], title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
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

        setIsRunning(true);
        setCompletedSimulations([]); // Clear previous completed results
        
        const combinations = selectedMolecules.flatMap(mol =>
            selectedProteins.map(prot => ({ molecule: mol, protein: prot }))
        );

        const initialResults: Result[] = combinations.map(({ molecule, protein }) => ({
            molecule,
            protein,
            status: 'preparing',
            step: 'preparing',
            progress: 0,
            refinedEnergy: null,
            prediction: null,
        }));
        setSimulationResults(initialResults);

        let completedCount = 0;

        const updateResult = (index: number, updates: Partial<Result>) => {
            setSimulationResults(prev => {
                const newResults = [...prev];
                newResults[index] = { ...newResults[index], ...updates };
                return newResults;
            });
        };

        const totalSimulations = combinations.length;

        for (let i = 0; i < totalSimulations; i++) {
            const { molecule, protein } = combinations[i];
            const resultIndex = i;

            try {
                // Step 1: Preparing
                updateResult(resultIndex, { status: 'simulating', step: 'preparing', progress: 10 });
                setCurrentStep(`[${i + 1}/${totalSimulations}] Preparing: ${molecule.name} + ${protein.name}`);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Step 2: Docking
                updateResult(resultIndex, { step: 'docking', progress: 40 });
                setCurrentStep(`[${i + 1}/${totalSimulations}] Docking: ${molecule.name} + ${protein.name}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Step 3: Quantum Refinement
                updateResult(resultIndex, { step: 'refining', progress: 70 });
                setCurrentStep(`[${i + 1}/${totalSimulations}] Quantum Refinement: ${molecule.name} + ${protein.name}`);
                const refinedEnergy = generateRefinedEnergy(molecule.smiles, protein.name);
                updateResult(resultIndex, { refinedEnergy: refinedEnergy });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Step 4: AI Prediction
                updateResult(resultIndex, { status: 'analyzing', step: 'predicting', progress: 90 });
                setCurrentStep(`[${i + 1}/${totalSimulations}] AI Analysis: ${molecule.name} + ${protein.name}`);
                
                const prediction = await predictBindingAffinities({
                    quantumRefinedEnergy: refinedEnergy,
                    moleculeSmiles: molecule.smiles,
                    proteinTargetName: protein.name,
                });

                updateResult(resultIndex, { status: 'complete', step: 'done', progress: 100, prediction: prediction });
                
                if (user && firestore) {
                    try {
                        const historyCollectionRef = collection(firestore, 'users', user.uid, 'loginHistory');
                        const latestSessionQuery = query(historyCollectionRef, orderBy('loginTime', 'desc'), limit(1));
                        const sessionSnapshot = await getDocs(latestSessionQuery);
                        if (!sessionSnapshot.empty) {
                            const sessionId = sessionSnapshot.docs[0].id;
                            const simulationLogRef = collection(firestore, 'users', user.uid, 'loginHistory', sessionId, 'dockingSimulations');
                            await addDoc(simulationLogRef, {
                                timestamp: serverTimestamp(),
                                moleculeSmiles: molecule.smiles,
                                proteinTarget: protein.name,
                                bindingAffinity: prediction.bindingAffinity,
                            });
                        }
                    } catch (e: any) {
                         // Non-blocking, just log it. This is a background task.
                         console.error("Failed to log simulation history:", e);
                         errorEmitter.emit(
                            'permission-error',
                            new FirestorePermissionError({
                                path: `users/${user?.uid}/loginHistory/.../dockingSimulations`,
                                operation: 'create',
                            })
                         );
                    }
                }


            } catch (error: any) {
                console.error("Simulation error:", error);
                const errorMessage = error.message || 'An unexpected internal error occurred during simulation.';
                updateResult(resultIndex, { status: 'error', progress: 100, error: errorMessage });
                 toast({
                    variant: 'destructive',
                    title: `Simulation Failed for ${molecule.name}`,
                    description: errorMessage,
                });
            } finally {
                completedCount++;
                setTotalProgress((completedCount / totalSimulations) * 100);
            }
        }
        
        setCurrentStep('All simulations complete!');
        setCompletedSimulations(prev => [...prev, ...simulationResults]);
        setSimulationResults([]);
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
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Quantum Docking Simulation</CardTitle>
                        <CardDescription>
                            Select your molecules and protein targets to begin.
                        </CardDescription>
                    </div>
                    <Button onClick={runSimulation} disabled={isRunning || selectedMolecules.length === 0 || selectedProteins.length === 0}>
                        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Docking ({selectedMolecules.length * selectedProteins.length})
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Molecules */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Beaker className="h-5 w-5" /> Molecules
                            </CardTitle>
                             <CardDescription>
                                Small-molecule compounds to be tested.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedMolecules.length > 0 ? (
                               <ScrollArea className="h-40">
                                <div className="space-y-2">
                                    {selectedMolecules.map(m => (
                                        <div key={m.smiles} className="flex items-center gap-2 text-sm">
                                            <Image 
                                                 src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(m.smiles)}/image?width=40&height=40`}
                                                 alt={`Structure of ${m.name}`}
                                                 width={40}
                                                 height={40}
                                                 className="rounded-md bg-white p-1"
                                                 unoptimized
                                            />
                                            <div>
                                                <p className="font-medium">{m.name}</p>
                                                <p className="text-muted-foreground">{m.formula}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                               </ScrollArea>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    No molecules selected.
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href={`/select-molecule?${proteinQueryString}&${diseaseQueryString}`}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    {selectedMolecules.length > 0 ? `Manage Selection (${selectedMolecules.length})` : 'Select Molecules'}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Proteins */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Dna className="h-5 w-5" /> Protein Targets
                            </CardTitle>
                             <CardDescription>
                                Biological targets for the molecules.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {selectedProteins.length > 0 ? (
                               <ScrollArea className="h-40">
                                <div className="space-y-4">
                                     {selectedProteins.map(p => (
                                        <div key={p.name} className="text-sm">
                                            <p className="font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                                        </div>
                                     ))}
                                </div>
                               </ScrollArea>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    No proteins selected.
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                           <Button asChild variant="outline" className="w-full">
                                <Link href={`/select-protein?${moleculeQueryString}&${diseaseQueryString}`}>
                                    <Settings className="mr-2 h-4 w-4" />
                                     {selectedProteins.length > 0 ? `Manage Selection (${selectedProteins.length})` : 'Select Proteins'}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Diseases */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5" /> AI Target Suggestions
                            </CardTitle>
                            <CardDescription>
                                Get protein target ideas for specific diseases.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedDiseases.length > 0 ? (
                               <ScrollArea className="h-40">
                                <div className="flex flex-wrap gap-2">
                                    {selectedDiseases.map(d => (
                                        <Badge key={d} variant="secondary">{d}</Badge>
                                    ))}
                                </div>
                               </ScrollArea>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    No diseases selected for suggestions.
                                </div>
                            )}
                        </CardContent>
                         <CardFooter>
                           <Button asChild variant="outline" className="w-full">
                                <Link href={`/select-disease?${moleculeQueryString}&${proteinQueryString}`}>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Get Suggestions
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {isRunning && (
                    <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{currentStep}</p>
                            <Progress value={totalProgress} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {simulationResults.map((result, index) => (
                                <Card key={index}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">{result.molecule.name} + {result.protein.name}</CardTitle>
                                        {result.status === 'simulating' || result.status === 'analyzing' ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : null}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground capitalize">{result.step}...</div>
                                        <Progress value={result.progress} className="mt-2 h-2" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>

            {completedSimulations.length > 0 && (
                <SimulationResultsDisplay results={completedSimulations} title="Completed Simulations" />
            )}
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
