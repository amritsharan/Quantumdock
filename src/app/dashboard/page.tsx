
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DockingForm } from '@/components/quantum-dock/docking-form';
import { MoleculeViewer } from '@/components/quantum-dock/molecule-viewer';
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import { runFullDockingProcess } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Box, Dna, FlaskConical, Save } from 'lucide-react';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { molecules, type Molecule } from '@/lib/molecules';
import { proteins, type Protein } from '@/lib/proteins';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';


type ProcessStep = 'idle' | 'classical' | 'predicting' | 'done' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const stepDescriptions: Record<ProcessStep, { icon: React.ReactNode; title: string; description: string }> = {
  idle: {
    icon: <Box className="h-12 w-12 text-muted-foreground" />,
    title: 'Ready for Docking',
    description: 'Enter molecular data and select a target to begin the simulation.',
  },
  classical: {
    icon: <Dna className="h-12 w-12 animate-spin text-accent" />,
    title: 'Performing Classical Docking...',
    description: 'Simulating AutoDock to generate initial poses. This may take a moment.',
  },
  predicting: {
    icon: <FlaskConical className="h-12 w-12 text-accent" />,
    title: 'Simulating a quantum refinement step and predicting binding affinity...',
    description: 'Simulating quantum analysis to predict binding strength.',
  },
  done: {
    icon: <Box className="h-12 w-12 text-accent" />,
    title: 'Docking Complete',
    description: 'Results are displayed below. You can now save the data or start a new simulation.',
  },
  error: {
    icon: <Box className="h-12 w-12 text-destructive" />,
    title: 'An Error Occurred',
    description: 'Something went wrong during the process. Please check your inputs or try again later.',
  },
};

function Dashboard() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();

  
  const form = useForm<z.infer<typeof dockingSchema>>({
    resolver: zodResolver(dockingSchema),
    defaultValues: {
      smiles: [],
      proteinTargets: [],
      diseaseKeywords: [],
    },
  });

  const selectedSmiles = form.watch('smiles');
  const selectedProteinNames = form.watch('proteinTargets');

  const selectedMolecules = useMemo(() => {
      if (!selectedSmiles) return [];
      return molecules.filter(m => selectedSmiles.includes(m.smiles));
  }, [selectedSmiles]);
  
  const totalMolecularWeight = useMemo(() => {
    const selectedMolecules = molecules.filter(m => selectedSmiles.includes(m.smiles));
    const selectedProteins = proteins.filter(p => selectedProteinNames.includes(p.name));

    const maxMoleculeWeight = selectedMolecules.length > 0
      ? Math.max(...selectedMolecules.map(m => m.molecularWeight))
      : 0;

    const maxProteinWeight = selectedProteins.length > 0
      ? Math.max(...selectedProteins.map(p => p.molecularWeight))
      : 0;
      
    return maxMoleculeWeight + maxProteinWeight;
  }, [selectedSmiles, selectedProteinNames]);
  
  const bestSmiles = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results.reduce((best, current) => {
        return current.bindingAffinity < best.bindingAffinity ? current : best;
    }).moleculeSmiles;
  }, [results]);

  useEffect(() => {
    const smilesParam = searchParams.get('smiles');
    const diseasesParam = searchParams.get('diseases');
    const proteinsParam = searchParams.get('proteins');
    const proteinParam = searchParams.get('protein'); // Legacy

    const smiles = smilesParam ? JSON.parse(smilesParam) : [];
    const diseases = diseasesParam ? JSON.parse(diseasesParam) : [];
    let proteins = proteinsParam ? JSON.parse(proteinsParam) : [];
    
    if(proteinParam && !proteinsParam) {
      proteins.push(proteinParam);
    }

    form.reset({
      smiles,
      diseaseKeywords: diseases,
      proteinTargets: proteins,
    });
  }, [searchParams, form]);


  const onSubmit = async (data: z.infer<typeof dockingSchema>) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be signed in to run a simulation.',
        });
        return;
    }
    setStep('classical');
    setResults(null);
    setIsDocked(false);
    setSaveState('idle'); // Reset save state for new simulation

    const totalCombinations = data.smiles.length * data.proteinTargets.length;
    toast({
      title: 'Starting Simulation...',
      description: `Running classical and quantum simulations for ${totalCombinations} combinations.`,
    });

    try {
      // The server action now internally handles the different steps.
      // We'll update the UI step after a delay to give a sense of progress.
      const processPromise = runFullDockingProcess(data, user.uid);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('predicting');

      const finalResults = await processPromise;
      
      setResults(finalResults);
      setStep('done');
      setIsDocked(true);

      toast({
        title: 'Simulations Complete',
        description: `Binding affinity predictions for ${totalCombinations} molecule-protein combinations were successful.`,
      });

    } catch (error: any) {
      setStep('error');
      const errorMessage = error.message.includes("overloaded")
        ? "The AI model is currently overloaded. Please try the simulation again in a few moments."
        : error.message || 'An unknown error occurred during the simulation.';
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: errorMessage,
      });
    }
  };

  const handleSaveResults = async () => {
    if (!user || !firestore || !results) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'User is not authenticated, results are missing, or Firestore is unavailable.',
      });
      return;
    }

    setSaveState('saving');
    try {
      const historyQuery = query(
        collection(firestore, "users", user.uid, "loginHistory"),
        orderBy("loginTime", "desc"),
        limit(1)
      );

      const historySnapshot = await getDocs(historyQuery);
      if (historySnapshot.empty) {
        throw new Error("No active login session found. Please sign out and back in.");
      }

      const latestSessionDoc = historySnapshot.docs[0];
      const simulationsCollectionRef = collection(firestore, 'users', user.uid, 'loginHistory', latestSessionDoc.id, 'dockingSimulations');
      
      let savedCount = 0;
      for (const result of results) {
          const simulationData = {
              userId: user.uid,
              loginHistoryId: latestSessionDoc.id,
              timestamp: serverTimestamp(),
              moleculeSmiles: result.moleculeSmiles,
              proteinTarget: result.proteinTarget,
              bindingAffinity: result.bindingAffinity,
              confidenceScore: result.confidenceScore,
              rationale: result.rationale,
          };
          
          addDoc(simulationsCollectionRef, simulationData).catch((serverError) => {
              const permissionError = new FirestorePermissionError({
                  path: simulationsCollectionRef.path,
                  operation: 'create',
                  requestResourceData: simulationData,
              });
              errorEmitter.emit('permission-error', permissionError);
          });
          savedCount++;
      }

      // We optimistically assume saves will work and update the UI.
      // The error emitter will handle any permission errors.
      setSaveState('saved');
      toast({
        title: 'Results Saved',
        description: `Successfully saved ${savedCount} simulation results to your history.`,
      });

    } catch (error) {
      setSaveState('error');
      console.error('Failed to save docking results:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: (error as Error).message || 'An unexpected error occurred while saving.',
      });
    }
  };


  const currentStepInfo = stepDescriptions[step];

  const chartData = useMemo(() => {
    if (!results) return [];
    const resultsWithNames = results.map(result => {
        const molecule = molecules.find(m => m.smiles === result.moleculeSmiles);
        return {
            ...result,
            name: molecule ? molecule.name : 'Unknown Molecule',
        };
    });
    return resultsWithNames.sort((a, b) => a.bindingAffinity - b.bindingAffinity).map(res => ({
      name: `${res.name} + ${res.proteinTarget}`,
      'Binding Affinity (nM)': res.bindingAffinity,
    }));
  }, [results]);

  const chartConfig = {
    'Binding Affinity (nM)': {
      label: 'Binding Affinity (nM)',
      color: 'hsl(var(--accent))',
    },
  };


  return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
          <div className="grid auto-rows-max items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Docking Simulation</CardTitle>
                <CardDescription>Input your molecule(s) and target(s) to begin.</CardDescription>
              </CardHeader>
              <CardContent>
                <DockingForm 
                  form={form} 
                  onSubmit={onSubmit} 
                  isLoading={step !== 'idle' && step !== 'done' && step !== 'error'}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid auto-rows-max items-start gap-6">
            <Card className="relative">
              <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription>Interactive 3D view and binding affinity results.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="min-h-[400px] lg:min-h-[500px] relative">
                    <MoleculeViewer 
                      isDocked={isDocked} 
                      selectedSmiles={selectedSmiles}
                      bestSmiles={bestSmiles}
                    />
                    {(step === 'classical' || step === 'predicting') && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
                        {currentStepInfo.icon}
                        <div className="text-center">
                        <h3 className="text-xl font-semibold">{currentStepInfo.title}</h3>
                        <p className="text-muted-foreground">{currentStepInfo.description}</p>
                        </div>
                    </div>
                    )}
                </div>
                
                {selectedMolecules.length > 0 && (
                  <div className="grid gap-4">
                     <div className="rounded-lg border p-3 text-center">
                      <p className="text-sm text-muted-foreground">Max Combined MW (kDa)</p>
                      <p className="text-2xl font-bold">{(totalMolecularWeight / 1000).toFixed(1)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Selected Molecule Weights (Da)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {selectedMolecules.map(m => (
                          <div key={m.smiles} className="flex justify-between rounded-md bg-muted/50 p-2">
                            <span className="truncate pr-2">{m.name}</span>
                            <span className="font-mono">{m.molecularWeight.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {results && step === 'done' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Binding Affinity Chart</h3>
                    <p className="text-sm text-muted-foreground mb-4">Lower values indicate stronger binding affinity.</p>
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                        <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        />
                        <XAxis dataKey="Binding Affinity (nM)" type="number" />
                        <Tooltip
                            cursor={{ fill: "hsl(var(--muted))" }}
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="Binding Affinity (nM)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {results && step === 'done' && (
              <ResultsDisplay 
                results={results} 
                onSave={handleSaveResults}
                saveState={saveState}
              />
            )}
          </div>
        </div>
      </main>
      <Toaster />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
