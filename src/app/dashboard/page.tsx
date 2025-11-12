
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
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import { ComparativeAnalysisDisplay } from '@/components/quantum-dock/comparative-analysis-display';
import { MoleculeViewer } from '@/components/quantum-dock/molecule-viewer';
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

  useEffect(() => {
    if (step === 'done' && results) {
      setStep('analyzing');
      toast({
        title: 'Analyzing Results',
        description: 'Comparing your results to scientific literature...'
      });

      const analysisInput = results.map(r => ({
          moleculeSmiles: r.moleculeSmiles,
          proteinTarget: r.proteinTarget,
          bindingAffinity: r.bindingAffinity,
          confidenceScore: r.confidenceScore,
          rationale: r.rationale,
          standardModelScore: r.standardModelScore,
          aiCommentary: r.explanation,
      }));

      analyzeResearchComparison(analysisInput)
        .then(analysisResult => {
            setAnalysis(analysisResult);
            toast({
                title: 'Analysis Complete',
                description: 'AI-powered literature comparison is ready.'
            });
        })
        .catch(error => {
            console.error('Analysis failed:', error);
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: 'Could not compare results to literature.'
            });
        })
        .finally(() => {
            setStep('done');
        });
    }
  }, [step, results, toast]);

  const handleSaveResults = async () => {
    if (!user || !results) {
        toast({ variant: 'destructive', title: 'Save Error', description: 'No user or results to save.' });
        return;
    }
    setSaveState('saving');
    try {
        await saveDockingResults(user.uid, results);
        setSaveState('saved');
        toast({ title: 'Success', description: 'Docking results saved to your history.' });
    } catch (error: any) {
        setSaveState('error');
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'Could not save results.' });
    }
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

  const isLoading = step === 'predicting' || step === 'analyzing' || step === 'classical';
  
  const bestSmiles = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results.reduce((best, current) => {
        return current.bindingAffinity < best.bindingAffinity ? current : best;
    }).moleculeSmiles;
  }, [results]);

  return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
          
          <div className="grid auto-rows-max items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Controls</CardTitle>
                <CardDescription>Select molecules and protein targets to begin your docking simulation.</CardDescription>
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
                         <div className="grid grid-cols-2 gap-2">
                          <Button asChild variant="outline">
                              <Link href={buildLink('/select-protein')}>
                                  Change Selection
                              </Link>
                          </Button>
                           <Button asChild variant="outline">
                              <Link href={buildLink('/select-disease')}>
                                  Select by Disease
                              </Link>
                          </Button>
                        </div>
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

            <Card>
              <CardHeader>
                  <CardTitle>Selected Molecule Properties</CardTitle>
              </CardHeader>
              <CardContent>
                  {selectedMolecules.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                          <div className="grid grid-cols-1 gap-4">
                              {selectedMolecules.map(m => (
                                  <div key={m.smiles} className="text-sm p-3 bg-muted/50 rounded-md">
                                      <p className="font-bold">{m.name}</p>
                                      <p><span className="text-muted-foreground">Formula:</span> {m.formula}</p>
                                      <p><span className="text-muted-foreground">Weight (Da):</span> {m.molecularWeight.toFixed(2)}</p>
                                  </div>
                              ))}
                          </div>
                      </ScrollArea>
                  ) : (
                      <div className="flex items-center justify-center h-24">
                          <p className="text-sm text-muted-foreground">Select molecules to see their properties.</p>
                      </div>
                  )}
              </CardContent>
            </Card>

          </div>

          <div className="grid auto-rows-max items-start gap-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Max Combined MW (kDa)</CardTitle>
                        <CardDescription>The theoretical maximum molecular weight of your selected pairs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{maxCombinedMW > 0 ? maxCombinedMW.toFixed(2) : 'N/A'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Molecule Viewer</CardTitle>
                        <CardDescription>Visualize the selected molecules. Best result shown after simulation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="min-h-[150px] relative rounded-md border flex items-center justify-center">
                            <MoleculeViewer
                                isDocked={!!results}
                                selectedSmiles={selectedSmiles}
                                bestSmiles={bestSmiles}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {results && (
              <Card>
                <CardHeader>
                    <CardTitle>Analysis & Results</CardTitle>
                    <CardDescription>Explore the detailed results and AI-powered analysis of your simulation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResultsDisplay results={results} onSave={handleSaveResults} saveState={saveState} />
                </CardContent>
              </Card>
            )}

            {analysis && (
                <ComparativeAnalysisDisplay analysis={analysis} />
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
