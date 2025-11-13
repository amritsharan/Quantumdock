
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { molecules as allMolecules, type Molecule } from '@/lib/molecules';
import { proteins as allProteins, type Protein } from '@/lib/proteins';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Beaker, Dna, FileText, Loader2, Play, Settings, Bot, Building } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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

    const [apiKey, setApiKey] = useState('');

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

        toast({
            variant: 'default',
            title: 'Simulation Not Implemented',
            description: 'The docking simulation logic needs to be re-implemented.',
        });
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
            <div className="grid gap-6">
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
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Molecule Viewer</CardTitle>
                        <CardDescription>
                            Select molecules, protein targets, and get AI-driven suggestions based on diseases.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 flex flex-col gap-6">
                            {/* Molecules Section */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 font-semibold"><Beaker className="h-5 w-5" /> Molecules</h3>
                                <Card className="p-4">
                                    {selectedMolecules.length > 0 ? (
                                        <ScrollArea className="h-24">
                                            <ul className="space-y-1 text-sm text-muted-foreground">
                                                {selectedMolecules.map(m => <li key={m.smiles}>{m.name}</li>)}
                                            </ul>
                                        </ScrollArea>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            No molecules selected.
                                        </div>
                                    )}
                                </Card>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <Link href={`/select-molecule?${proteinQueryString}&${diseaseQueryString}`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Molecules selection
                                    </Link>
                                </Button>
                            </div>

                             {/* Diseases Section */}
                             <div className="space-y-2">
                                <h3 className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" /> Select Diseases</h3>
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
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Disease selection
                                    </Link>
                                </Button>
                            </div>
                            
                            {/* Proteins Section */}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 font-semibold"><Dna className="h-5 w-5" /> Protein Targets</h3>
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
                                        <Settings className="mr-2 h-4 w-4" />
                                        {selectedProteins.length > 0 ? `Target selection (${selectedProteins.length})` : 'Target selection'}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            {/* Placeholder for future content, perhaps a 3D viewer or results summary */}
                            <Card className="flex h-full items-center justify-center bg-muted/30 border-dashed">
                                <div className="text-center text-muted-foreground">
                                    <p>Simulation results will appear here.</p>
                                </div>
                            </Card>
                        </div>
                    </CardContent>
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

            {completedSimulations.length > 0 && (
                <SimulationResultsDisplay results={completedSimulations} title="Completed Simulations" />
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        API Key Management
                    </CardTitle>
                    <CardDescription>
                        Manage your Gemini API key. You can generate a new key from Google AI Studio.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="apiKey" className="text-sm font-medium">Your Gemini API Key</label>
                        <Input
                            id="apiKey"
                            type="password"
                            placeholder="Enter your API key here"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Your key is stored in an environment variable. This field is for display and update purposes.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button asChild variant="outline">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                            Generate New Key in AI Studio
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                    <Button onClick={() => toast({ title: "API Key", description: "Functionality to update the key is not yet implemented." })}>
                        Save Key
                    </Button>
                </CardFooter>
            </Card>

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

    