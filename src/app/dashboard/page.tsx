
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { runFullDockingProcess, saveDockingResults } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';
import { useUser } from '@/firebase';
import { analyzeResearchComparison, type ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { molecules } from '@/lib/molecules';
import { proteins } from '@/lib/proteins';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';


type ProcessStep = 'idle' | 'classical' | 'predicting' | 'analyzing' | 'done' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';


function Dashboard() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [analysis, setAnalysis] = useState<ResearchComparisonOutput | null>(null);
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
  const selectedProteinNames = form.watch('proteinTargets');

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


  const { selectedMolecules, selectedProteins, maxCombinedMW } = useMemo(() => {
    const sm = molecules.filter(m => selectedSmiles.includes(m.smiles));
    const sp = proteins.filter(p => selectedProteinNames.includes(p.name));
    
    let maxMw = 0;
    if (sm.length > 0 && sp.length > 0) {
        const maxMoleculeWeight = Math.max(...sm.map(m => m.molecularWeight));
        const maxProteinWeight = Math.max(...sp.map(p => p.molecularWeight));
        maxMw = (maxMoleculeWeight + maxProteinWeight) / 1000; // Convert to kDa
    }
    
    return {
      selectedMolecules: sm,
      selectedProteins: sp,
      maxCombinedMW: maxMw,
    };
  }, [selectedSmiles, selectedProteinNames]);


  const totalCombinations = useMemo(() => {
    const numSmiles = selectedMolecules?.length || 0;
    const numProteins = selectedProteins?.length || 0;
    return numSmiles * numProteins;
  }, [selectedMolecules, selectedProteins]);
  

  const onSubmit = async (data: z.infer<typeof dockingSchema>) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be signed in to run a simulation.',
        });
        return;
    }
    setStep('predicting');
    setResults(null);
    setAnalysis(null);
    setSaveState('idle');

    const totalCombinations = data.smiles.length * data.proteinTargets.length;
    toast({
      title: 'Starting Simulation...',
      description: `Running classical and quantum simulations for ${totalCombinations} combinations.`,
    });

    try {
      const finalResults = await runFullDockingProcess(data, user.uid);
      setResults(finalResults);
      setStep('done');
      toast({
        title: 'Simulations Complete',
        description: `Binding affinity predictions were successful.`,
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

  const buildLink = (pathname: string) => {
    const params = new URLSearchParams();
    const smiles = form.getValues('smiles');
    const diseases = form.getValues('diseaseKeywords');
    const proteins = form.getValues('proteinTargets');

    if (smiles?.length) params.set('smiles', JSON.stringify(smiles));
    if (diseases?.length) params.set('diseases', JSON.stringify(diseases));
    if (proteins?.length) params.set('proteins', JSON.stringify(proteins));

    return `${pathname}?${params.toString()}`;
  }

  const isLoading = step === 'predicting';

  return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[320px_1fr] lg:grid-cols-[320px_1fr]">
          
          {/* Left Column for Controls */}
          <div className="grid auto-rows-max items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>Select molecules and proteins to begin.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                    <div className="grid gap-2">
                        <Label>Protein Targets ({selectedProteins.length})</Label>
                         <Card className="min-h-[80px]">
                           <CardContent className="p-2">
                             {selectedProteins.length > 0 ? (
                                <ScrollArea className="h-20">
                                    <ul className="space-y-1">
                                        {selectedProteins.map(p => (
                                            <li key={p.name} className="text-sm p-2 bg-muted/50 rounded-md">
                                                {p.name}
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                             ) : (
                                <div className="flex items-center justify-center h-20">
                                    <p className="text-sm text-muted-foreground">No targets selected.</p>
                                </div>
                             )}
                           </CardContent>
                        </Card>
                        <Button asChild variant="outline">
                            <Link href={buildLink('/select-protein')}>
                                Change Selection ({selectedProteins.length})
                            </Link>
                        </Button>
                    </div>

                     <div className="grid gap-2">
                        <Label>Molecules ({selectedMolecules.length})</Label>
                         <Button asChild variant="outline">
                            <Link href={buildLink('/select-molecule')}>
                                Change Selection ({selectedMolecules.length})
                            </Link>
                        </Button>
                    </div>

                    <Button type="submit" disabled={isLoading || totalCombinations === 0} className="w-full">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isLoading ? 'Running Simulation...' : `Run Docking for ${totalCombinations} Combination(s)`}
                    </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column for Visualization and Data */}
          <div className="grid auto-rows-max items-start gap-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Max Combined MW (kDa)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{maxCombinedMW > 0 ? maxCombinedMW.toFixed(2) : 'N/A'}</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Selected Molecule Properties</CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedMolecules.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedMolecules.map(m => (
                                <div key={m.smiles} className="text-sm p-3 bg-muted/50 rounded-md">
                                    <p className="font-bold">{m.name}</p>
                                    <p><span className="text-muted-foreground">Formula:</span> {m.formula}</p>
                                    <p><span className="text-muted-foreground">Weight (Da):</span> {m.molecularWeight.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-24">
                            <p className="text-sm text-muted-foreground">Select molecules to see their properties.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Binding Affinity Chart</CardTitle>
                    <CardDescription>Lower values indicate stronger binding affinity. Results will appear here after running a simulation.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="flex items-center justify-center h-[250px]">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!isLoading && (!results || results.length === 0) && (
                        <div className="flex items-center justify-center h-[250px]">
                            <p className="text-muted-foreground">Run a simulation to see results.</p>
                        </div>
                    )}
                    {!isLoading && results && results.length > 0 && (
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 150, right: 20 }}>
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
