
'use client';

import { useState, useEffect } from 'react';
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
import { BrainCircuit, Box, Dna, FlaskConical } from 'lucide-react';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';


type ProcessStep = 'idle' | 'classical' | 'predicting' | 'done' | 'error';

const stepDescriptions: Record<ProcessStep, { icon: React.ReactNode; title: string; description: string }> = {
  idle: {
    icon: <Box className="h-12 w-12 text-muted-foreground" />,
    title: 'Ready for Docking',
    description: 'Enter molecular data and select a target to begin the simulation.',
  },
  classical: {
    icon: <Dna className="h-12 w-12 animate-spin text-accent" />,
    title: 'Performing Classical Docking...',
    description: 'Generating initial poses. This may take a moment.',
  },
  predicting: {
    icon: <FlaskConical className="h-12 w-12 text-accent" />,
    title: 'Predicting Binding Affinity...',
    description: 'Analyzing energies to predict binding strength.',
  },
  done: {
    icon: <Box className="h-12 w-12 text-accent" />,
    title: 'Docking Complete',
    description: 'Results are displayed below. You can now export the data or start a new simulation.',
  },
  error: {
    icon: <Box className="h-12 w-12 text-destructive" />,
    title: 'An Error Occurred',
    description: 'Something went wrong during the process. Please check your inputs or try again later.',
  },
};

export default function DashboardPage() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  
  const form = useForm<z.infer<typeof dockingSchema>>({
    resolver: zodResolver(dockingSchema),
    defaultValues: {
      smiles: [],
      proteinTargets: [],
      diseaseKeywords: [],
    },
  });

  const selectedSmiles = form.watch('smiles');

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
    setStep('classical');
    setResults(null);
    setIsDocked(false);

    const totalCombinations = data.smiles.length * data.proteinTargets.length;

    try {
      // Simulate the steps for UI feedback, but run the full batch process.
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('predicting');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send all combinations to the server action at once.
      const finalResults = await runFullDockingProcess(data);
      
      setResults(finalResults);
      setStep('done');
      setIsDocked(true);

      toast({
        title: 'Simulations Complete',
        description: `Binding affinity predictions for ${totalCombinations} molecule-protein combinations were successful.`,
      });

    } catch (error) {
      console.error(error);
      setStep('error');
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: (error as Error).message || 'An error occurred while running the docking process.',
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
            <Card className="relative min-h-[500px] lg:min-h-[600px]">
              <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription>Interactive 3D view of the molecular complex.</CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <MoleculeViewer 
                  isDocked={isDocked} 
                  selectedSmiles={selectedSmiles}
                />
              </CardContent>

              {(step === 'classical' || step === 'predicting') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
                  {currentStepInfo.icon}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{currentStepInfo.title}</h3>
                    <p className="text-muted-foreground">{currentStepInfo.description}</p>
                  </div>
                </div>
              )}
            </Card>

            {results && step === 'done' && (
              <ResultsDisplay results={results} />
            )}
          </div>
        </div>
      </main>
      <Toaster />
    </>
  );
}
