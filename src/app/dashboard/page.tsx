
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DockingForm } from '@/components/quantum-dock/docking-form';
import { runFullDockingProcess } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Box, Dna, FlaskConical, Save, Target, Check, AlertTriangle, ListChecks } from 'lucide-react';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeResearchComparison, type ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { ResultsTabs } from '@/components/quantum-dock/results-tabs';


type ProcessStep = 'idle' | 'classical' | 'predicting' | 'analyzing' | 'done' | 'error';
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
    title: 'Simulating quantum refinement & predicting affinity...',
    description: 'Simulating quantum analysis and using AI to predict binding strength.',
  },
  analyzing: {
    icon: <BrainCircuit className="h-12 w-12 animate-pulse text-accent" />,
    title: 'Performing Comparative Literature Analysis...',
    description: 'Comparing your simulation results against recent scientific literature.',
  },
  done: {
    icon: <Check className="h-12 w-12 text-green-500" />,
    title: 'Docking & Analysis Complete',
    description: 'Results are available in the tabs below. You can now save or start a new simulation.',
  },
  error: {
    icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
    title: 'An Error Occurred',
    description: 'Something went wrong during the process. Please check your inputs or try again later.',
  },
};

function Dashboard() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [analysis, setAnalysis] = useState<ResearchComparisonOutput | null>(null);
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
    setAnalysis(null);
    setSaveState('idle');

    const totalCombinations = data.smiles.length * data.proteinTargets.length;
    toast({
      title: 'Starting Simulation...',
      description: `Running classical and quantum simulations for ${totalCombinations} combinations.`,
    });

    try {
      // Step 1: Run docking process
      const processPromise = runFullDockingProcess(data, user.uid);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('predicting');

      const finalResults = await processPromise;
      setResults(finalResults);

      toast({
        title: 'Simulations Complete',
        description: `Binding affinity predictions were successful. Now analyzing against literature...`,
      });

      // Step 2: Run comparative analysis
      setStep('analyzing');
      const analysisResult = await analyzeResearchComparison(finalResults);
      setAnalysis(analysisResult);
      
      setStep('done');

      toast({
        title: 'Analysis Complete',
        description: 'Comparative literature analysis is finished.',
      });

    } catch (error: any) {
      setStep('error');
      const errorMessage = error.message.includes("overloaded")
        ? "The AI model is currently overloaded. Please try the simulation again in a few moments."
        : error.message || 'An unknown error occurred during the simulation.';
      toast({
        variant: 'destructive',
        title: 'Process Failed',
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
              rationale: result.rationale,
              standardModelScore: result.standardModelScore,
              explanation: result.explanation,
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
            <Card className="min-h-[500px]">
                <CardHeader>
                    <CardTitle>Analysis & Results</CardTitle>
                    <CardDescription>View simulation outputs and comparative analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'idle' && (
                        <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
                            {currentStepInfo.icon}
                            <h3 className="text-xl font-semibold">{currentStepInfo.title}</h3>
                            <p className="text-muted-foreground">{currentStepInfo.description}</p>
                        </div>
                    )}
                    {(step !== 'idle' && step !== 'done' && step !== 'error') && (
                        <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center bg-background/80 backdrop-blur-sm">
                            {currentStepInfo.icon}
                            <h3 className="text-xl font-semibold">{currentStepInfo.title}</h3>
                            <p className="text-muted-foreground">{currentStepInfo.description}</p>
                        </div>
                    )}
                    {step === 'error' && (
                         <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
                            {currentStepInfo.icon}
                            <h3 className="text-xl font-semibold">{currentStepInfo.title}</h3>
                            <p className="text-muted-foreground">{currentStepInfo.description}</p>
                        </div>
                    )}
                    {step === 'done' && results && analysis && (
                        <ResultsTabs 
                            results={results}
                            analysis={analysis}
                            saveState={saveState}
                            onSave={handleSaveResults}
                        />
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
