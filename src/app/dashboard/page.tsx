
'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { runFullDockingProcess } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Toaster } from '@/components/ui/toaster';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { MoleculeViewer } from '@/components/quantum-dock/molecule-viewer';
import { molecules } from '@/lib/molecules';
import { proteins } from '@/lib/proteins';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResultsTabs } from '@/components/quantum-dock/results-tabs';

type ProcessStep = 'idle' | 'predicting' | 'done' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Dashboard() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
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
  const selectedDiseaseKeywords = form.watch('diseaseKeywords');

  const saveDockingResults = async (firestore: any, userId: string, results: DockingResults[]) => {
    if (!firestore || !userId || !results || results.length === 0) {
      throw new Error("User ID, Firestore instance, and results are required to save.");
    }

    try {
        const historyQuery = query(
            collection(firestore, `users/${userId}/loginHistory`),
            orderBy("loginTime", "desc"),
            limit(1)
        );

        const historySnapshot = await getDocs(historyQuery);
        if (historySnapshot.empty) {
            throw new Error("No active login session found for the user.");
        }
        const latestSessionDoc = historySnapshot.docs[0];
        const simulationsCollectionRef = collection(firestore, `users/${userId}/loginHistory/${latestSessionDoc.id}/dockingSimulations`);
        
        const batch = writeBatch(firestore);
        for (const result of results) {
            const simulationData = {
                userId: userId,
                loginHistoryId: latestSessionDoc.id,
                timestamp: serverTimestamp(),
                moleculeSmiles: result.moleculeSmiles,
                proteinTarget: result.proteinTarget,
                bindingAffinity: result.bindingAffinity,
            };
            const newDocRef = doc(simulationsCollectionRef);
            batch.set(newDocRef, simulationData);
        }

        await batch.commit();
    } catch (error) {
        console.error("Failed to save docking results: ", error);
        throw new Error("Could not save docking results due to a database error or permissions issue.");
    }
}


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


  const { selectedMolecules, selectedProteins } = useMemo(() => {
    const sm = molecules.filter(m => selectedSmiles.includes(m.smiles));
    const sp = proteins.filter(p => selectedProteinNames.includes(p.name));
    
    return {
      selectedMolecules: sm,
      selectedProteins: sp,
    };
  }, [selectedSmiles, selectedProteinNames]);


  const totalCombinations = useMemo(() => {
    const numSmiles = selectedSmiles?.length || 0;
    const numProteins = selectedProteinNames?.length || 0;
    return numSmiles * numProteins;
  }, [selectedSmiles, selectedProteinNames]);
  

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
    setSaveState('idle');

    const totalCombinations = data.smiles.length * data.proteinTargets.length;
    if(totalCombinations === 0) {
        toast({
            variant: 'destructive',
            title: 'Selection Error',
            description: 'Please select at least one molecule and one protein target.',
        });
        setStep('idle');
        return;
    }

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

  const handleSaveResults = async () => {
    if (!user || !results || !firestore) {
        toast({ variant: 'destructive', title: 'Save Error', description: 'No user, results, or firestore instance available to save.' });
        return;
    }
    setSaveState('saving');
    try {
        await saveDockingResults(firestore, user.uid, results);
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

  const isLoading = step === 'predicting';
  
  const bestResult = useMemo(() => {
    if (!results || results.length === 0) return null;
    const best = results.reduce((best, current) => {
        return current.bindingAffinity < best.bindingAffinity ? current : best;
    });
    const foundMolecule = molecules.find(m => m.smiles === best.moleculeSmiles);
    if (!foundMolecule) return null;
    
    return {
        ...best,
        ...foundMolecule
    };
}, [results]);

  return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
          
          <div className="grid auto-rows-max items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Molecule Viewer</CardTitle>
                <CardDescription>Select molecules, diseases, and protein targets to begin your simulation.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                    
                    <div className="grid gap-2">
                        <Label>1. Select Molecules ({selectedMolecules.length})</Label>
                         <Card className="min-h-[60px]">
                           <CardContent className="p-2">
                             {selectedMolecules.length > 0 ? (
                                <ScrollArea className="h-16">
                                    <ul className="space-y-1">
                                        {selectedMolecules.map(m => (
                                            <li key={m.smiles} className="text-sm p-1 bg-muted/50 rounded-md truncate">
                                                {m.name}
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                             ) : (
                                <div className="flex items-center justify-center h-16">
                                    <p className="text-sm text-muted-foreground">No molecules selected.</p>
                                </div>
                             )}
                           </CardContent>
                        </Card>
                         <Button asChild variant="outline">
                            <Link href={buildLink('/select-molecule')}>
                                {selectedMolecules.length > 0 ? `Change Molecule Selection` : 'Select Molecules'}
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-2">
                        <Label>2. Select Diseases ({selectedDiseaseKeywords.length})</Label>
                         <Card className="min-h-[60px]">
                           <CardContent className="p-2">
                             {selectedDiseaseKeywords.length > 0 ? (
                                <ScrollArea className="h-16">
                                    <ul className="space-y-1">
                                        {selectedDiseaseKeywords.map(d => (
                                            <li key={d} className="text-sm p-1 bg-muted/50 rounded-md truncate">
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                             ) : (
                                <div className="flex items-center justify-center h-16">
                                    <p className="text-sm text-muted-foreground">No diseases selected.</p>
                                </div>
                             )}
                           </CardContent>
                        </Card>
                        <Button asChild variant="outline">
                            <Link href={buildLink('/select-disease')}>
                                {selectedDiseaseKeywords.length > 0 ? `Change Disease Selection` : 'Select Diseases'}
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-2">
                        <Label>3. Protein Targets ({selectedProteins.length})</Label>
                         <Card className="min-h-[60px]">
                           <CardContent className="p-2">
                             {selectedProteins.length > 0 ? (
                                <ScrollArea className="h-16">
                                    <ul className="space-y-1">
                                        {selectedProteins.map(p => (
                                            <li key={p.name} className="text-sm p-1 bg-muted/50 rounded-md truncate">
                                                {p.name}
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                             ) : (
                                <div className="flex items-center justify-center h-16">
                                    <p className="text-sm text-muted-foreground">No targets selected.</p>
                                </div>
                             )}
                           </CardContent>
                        </Card>
                         <Button asChild variant="outline">
                            <Link href={buildLink('/select-protein')}>
                                {selectedProteins.length > 0 ? 'Change Protein Selection' : 'Select Protein Targets'}
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

          <div className="grid auto-rows-max items-start gap-6">
            
             <MoleculeViewer
              isDocked={!!results}
              molecules={selectedMolecules}
              bestResultMolecule={bestResult}
            />
            
            {isLoading && (
              <Card>
                <CardHeader>
                    <CardTitle>Detailed Prediction Results</CardTitle>
                    <CardDescription>Please wait while the simulation completes.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[200px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                      Running docking simulations...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'done' && results && results.length > 0 && (
              <Card>
                <CardHeader>
                    <CardTitle>Analysis & Results</CardTitle>
                    <CardDescription>Explore the detailed results and AI-powered analysis of your simulation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResultsTabs results={results} onSave={handleSaveResults} saveState={saveState} />
                </CardContent>
              </Card>
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

    