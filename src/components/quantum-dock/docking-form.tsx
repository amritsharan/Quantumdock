
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

interface DockingFormProps {
  form: UseFormReturn<z.infer<typeof dockingSchema>>;
  onSubmit: (values: z.infer<typeof dockingSchema>) => void;
  isLoading: boolean;
}

export function DockingForm({ form, onSubmit, isLoading }: DockingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestedTargets, setSuggestedTargets] = useState<string[]>([]);
  const searchParams = useSearchParams();
  
  const diseaseKeywords = form.watch('diseaseKeywords') || [];
  const selectedSmiles = form.watch('smiles') || [];
  const selectedProteins = form.watch('proteinTargets') || [];

  const selectedMolecules = molecules.filter(m => selectedSmiles.includes(m.smiles));

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
    const params = new URLSearchParams(searchParams.toString());
    return `${pathname}?${params.toString()}`;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="smiles"
          render={() => (
            <FormItem>
              <FormLabel>Selected Molecules</FormLabel>
                <Card className="min-h-[100px]">
                   <CardContent className="p-2">
                     {selectedMolecules.length > 0 ? (
                        <ScrollArea className="h-24">
                            <ul className="space-y-1">
                                {selectedMolecules.map(m => (
                                    <li key={m.smiles} className="text-sm p-2 bg-muted/50 rounded-md">
                                        {m.name}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                     ) : (
                        <div className="flex items-center justify-center h-24">
                            <p className="text-sm text-muted-foreground">No molecules selected.</p>
                        </div>
                     )}
                   </CardContent>
                </Card>
                 <Button asChild variant="outline" className="w-full">
                    <Link href={buildLink('/select-molecule')}>
                        {selectedMolecules.length > 0 ? 'Change Molecule Selection' : 'Select Molecules'}
                    </Link>
                </Button>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="diseaseKeywords"
          render={() => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                Selected Diseases
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </FormLabel>
               <Card className="min-h-[100px]">
                   <CardContent className="p-2">
                     {diseaseKeywords.length > 0 ? (
                        <ScrollArea className="h-24">
                            <ul className="space-y-1">
                                {diseaseKeywords.map(d => (
                                    <li key={d} className="text-sm p-2 bg-muted/50 rounded-md">
                                        {d}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                     ) : (
                        <div className="flex items-center justify-center h-24">
                            <p className="text-sm text-muted-foreground">No diseases selected.</p>
                        </div>
                     )}
                   </CardContent>
                </Card>
                 <Button asChild variant="outline" className="w-full">
                    <Link href={buildLink('/select-disease')}>
                         {diseaseKeywords.length > 0 ? 'Change Disease Selection' : 'Select Diseases'}
                    </Link>
                </Button>
              <FormDescription>Get AI-powered protein target suggestions.</FormDescription>
               <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="proteinTargets"
          render={() => (
            <FormItem>
              <FormLabel>Protein Targets</FormLabel>
                <Card className="min-h-[100px]">
                   <CardContent className="p-2">
                     {selectedProteins.length > 0 ? (
                        <ScrollArea className="h-24">
                            <ul className="space-y-1">
                                {selectedProteins.map(p => (
                                    <li key={p} className="text-sm p-2 bg-muted/50 rounded-md">
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                     ) : (
                        <div className="flex items-center justify-center h-24">
                            <p className="text-sm text-muted-foreground">No protein targets selected.</p>
                        </div>
                     )}
                   </CardContent>
                </Card>
              <Button asChild variant="outline" className="w-full">
                  <Link href={buildLink('/select-protein')}>
                      {selectedProteins.length > 0 ? 'Change Protein Targets' : 'Select Protein Targets'}
                  </Link>
              </Button>
               <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || selectedMolecules.length === 0 || selectedProteins.length === 0} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Running Simulation...' : `Run Docking for ${selectedMolecules.length * selectedProteins.length} Combination(s)`}
        </Button>
      </form>
    </Form>
  );
}
