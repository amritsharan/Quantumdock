
'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProteinSuggestions } from '@/app/actions';
import { ScrollArea } from '../ui/scroll-area';
import { dockingSchema } from '@/lib/schema';
import { Card, CardContent } from '../ui/card';
import { molecules } from '@/lib/molecules';
import { proteins } from '@/lib/proteins';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface DockingFormProps {
  form: UseFormReturn<z.infer<typeof dockingSchema>>;
  onSubmit: (values: z.infer<typeof dockingSchema>) => void;
  isLoading: boolean;
}

export function DockingForm({ form, onSubmit, isLoading }: DockingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestedTargets, setSuggestedTargets] = useState<string[]>([]);
  
  const diseaseKeywords = form.watch('diseaseKeywords');
  const selectedSmiles = form.watch('smiles');
  const selectedProteinNames = form.watch('proteinTargets');

  const totalCombinations = useMemo(() => {
    const numSmiles = selectedSmiles?.length || 0;
    const numProteins = selectedProteinNames?.length || 0;
    return numSmiles * numProteins;
  }, [selectedSmiles, selectedProteinNames]);

  const selectedMolecules = useMemo(() => {
    return molecules.filter(m => selectedSmiles.includes(m.smiles));
  }, [selectedSmiles]);

  const selectedProteins = useMemo(() => {
    return proteins.filter(p => selectedProteinNames.includes(p.name));
  }, [selectedProteinNames]);

  const fetchSuggestions = useCallback((keywords: string[]) => {
    if (keywords && keywords.length > 0) {
      startTransition(async () => {
        const suggestions = await getProteinSuggestions(keywords);
        setSuggestedTargets(suggestions);
      });
    } else {
      setSuggestedTargets([]);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(diseaseKeywords);
  }, [diseaseKeywords, fetchSuggestions]);

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

  return (
    <Form {...form}>
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
                        <p className="text-sm text-muted-foreground">No protein targets selected.</p>
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
          <Label>Selected Molecules ({selectedMolecules.length})</Label>
           <Button asChild variant="outline">
              <Link href={buildLink('/select-molecule')}>
                  {selectedMolecules.length > 0 ? `Change Selection (${selectedMolecules.length})` : 'Select Molecules'}
              </Link>
          </Button>
        </div>

        <Button type="submit" disabled={isLoading || totalCombinations === 0} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Running Simulation...' : `Run Docking for ${totalCombinations} Combination(s)`}
        </Button>
      </form>
    </Form>
  );
}
