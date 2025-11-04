
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
import { BrainCircuit, Box, Dna, FlaskConical } from 'lucide-react';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { molecules, type Molecule } from '@/lib/molecules';
import { useUser } from '@/firebase';

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
    description: 'Simulating AutoDock to generate initial poses. This may take a moment.',
  },
  predicting: {
    icon: <FlaskConical className="h-12 w-12 text-accent" />,
    title: 'Quantum Refinement & Affinity Prediction...',
    description: 'Simulating quantum analysis to predict binding strength.',
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

function Dashboard() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { user } = useUser();

  
  const form = useForm<z.infer<typeof dockingSchema>>({
    resolver: zodResolver(dockingSchema),
    defaultValues: {
      smiles: [],
      proteinTargets: [],
      diseaseKeywords: [],
    },
  });

  const selectedSmiles = form.watch('smiles');
  
  const primaryMolecule = useMemo(() => {
    if (selectedSmiles && selectedSmiles.length > 0) {
      return molecules.find(m => m.smiles === selectedSmiles[0]);
    }
    return null;
  }, [selectedSmiles]);

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
                
                {isDocked && primaryMolecule && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Molecular Weight</p>
                      <p className="text-2xl font-bold">{primaryMolecule.molecularWeight.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">H-Bond Donors</p>
                      <p className="text-2xl font-bold">{primaryMolecule.donors}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">H-Bond Acceptors</p>
                      <p className="text-2xl font-bold">{primaryMolecule.acceptors}</p>
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
              <ResultsDisplay results={results} />
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
