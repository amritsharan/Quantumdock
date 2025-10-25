
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DockingForm } from '@/components/quantum-dock/docking-form';
import { MoleculeViewer } from '@/components/quantum-dock/molecule-viewer';
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import { runFullDockingProcess } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Box, Dna, FlaskConical } from 'lucide-react';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { dockingSchema, type DockingResults } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAuth, signOut } from 'firebase/auth';
import { useUser } from '@/firebase/auth/use-user';
import { withAuth } from '@/components/with-auth';


type ProcessStep = 'idle' | 'classical' | 'quantum' | 'predicting' | 'done' | 'error';

const stepDescriptions: Record<ProcessStep, { icon: React.ReactNode; title: string; description: string }> = {
  idle: {
    icon: <Box className="h-12 w-12 text-muted-foreground" />,
    title: 'Ready for Docking',
    description: 'Enter molecular data and select a target to begin the simulation.',
  },
  classical: {
    icon: <Dna className="h-12 w-12 animate-spin text-accent" />,
    title: 'Performing Classical Docking...',
    description: 'Generating initial poses using AutoDock. This may take a moment.',
  },
  quantum: {
    icon: <BrainCircuit className="h-12 w-12 animate-pulse text-accent" />,
    title: 'Running Quantum Refinement...',
    description: 'Refining docking poses with VQE for higher accuracy.',
  },
  predicting: {
    icon: <FlaskConical className="h-12 w-12 text-accent" />,
    title: 'Predicting Binding Affinity...',
    description: 'Analyzing quantum-refined energies to predict binding strength.',
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

function HomePageContent() {
  const [step, setStep] = useState<ProcessStep>('idle');
  const [results, setResults] = useState<DockingResults[] | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const email = user?.email;
  const searchParams = useSearchParams();

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
    // The withAuth HOC will handle the redirect to the login page.
  };
  
  const form = useForm<z.infer<typeof dockingSchema>>({
    resolver: zodResolver(dockingSchema),
    defaultValues: {
      smiles: [],
      proteinTarget: '',
      diseaseKeywords: [],
    },
  });

  useEffect(() => {
    const smilesParam = searchParams.get('smiles');
    if (smilesParam) {
      try {
        const smilesArray = JSON.parse(smilesParam);
        form.setValue('smiles', smilesArray);
      } catch (e) {
        console.error("Failed to parse smiles from URL", e);
      }
    }
    
    const diseasesParam = searchParams.get('diseases');
    if (diseasesParam) {
      try {
        const diseasesArray = JSON.parse(diseasesParam);
        form.setValue('diseaseKeywords', diseasesArray);
      } catch (e) {
        console.error("Failed to parse diseases from URL", e);
      }
    }
    
    const proteinParam = searchParams.get('protein');
    if (proteinParam) {
      form.setValue('proteinTarget', proteinParam);
    }

  }, [searchParams, form]);


  const onSubmit = async (data: z.infer<typeof dockingSchema>) => {
    setStep('classical');
    setResults(null);
    setIsDocked(false);

    let moleculesProcessed = 0;
    const totalMolecules = data.smiles.length;

    try {
      const finalResults : DockingResults[] = [];

      for (const smile of data.smiles) {
        moleculesProcessed++;
        const progress = `(${moleculesProcessed}/${totalMolecules})`

        setStep('classical');
        stepDescriptions.classical.title = `Classical Docking ${progress}`
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStep('quantum');
        stepDescriptions.quantum.title = `Quantum Refinement ${progress}`
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setStep('predicting');
        stepDescriptions.predicting.title = `Predicting Affinity ${progress}`
        const singleMoleculeData = { ...data, smiles: [smile] };
        const result = await runFullDockingProcess(singleMoleculeData);
        finalResults.push(...result);
      }

      setResults(finalResults);
      setStep('done');
      setIsDocked(true);

      toast({
        title: 'Simulations Complete',
        description: `Binding affinity predictions for ${totalMolecules} molecules were successful.`,
      });
    } catch (error) {
      console.error(error);
      setStep('error');
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: 'An error occurred while running the docking process.',
      });
    }
  };

  const currentStepInfo = stepDescriptions[step];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar>
                  <AvatarImage src={`https://avatar.vercel.sh/${email || ''}.png`} alt="User" />
                  <AvatarFallback>{email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/logins">Login History</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </header>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
          <div className="grid auto-rows-max items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Docking Simulation</CardTitle>
                <CardDescription>Input your molecule(s) and target to begin.</CardDescription>
              </CardHeader>
              <CardContent>
                <DockingForm form={form} onSubmit={onSubmit} isLoading={step !== 'idle' && step !== 'done' && step !== 'error'} />
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
                <MoleculeViewer isDocked={isDocked} />
              </CardContent>

              {(step === 'classical' || step === 'quantum' || step === 'predicting') && (
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
    </div>
  );
}

function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}


export default withAuth(Home);
