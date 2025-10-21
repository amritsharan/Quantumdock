'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { getProteinSuggestions } from '@/app/actions';
import { ScrollArea } from '../ui/scroll-area';
import { dockingSchema } from '@/lib/schema';

const defaultTargets = [
  'Thrombin',
  'Factor Xa',
  'VEGFR2',
  'EGFR',
  'BRD4',
];

const moleculeOptions = [
    { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
    { name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
    { name: 'Paracetamol', smiles: 'CC(=O)NC1=CC=C(O)C=C1' },
    { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
    { name: 'Metformin', smiles: 'CN(C)C(=N)N=C(N)N' },
    { name: 'Benzene', smiles: 'c1ccccc1' },
];

const diseaseOptions = [
  "Alzheimer's Disease",
  'Cancer',
  'Diabetes',
  'Heart Disease',
  'Hypertension',
  'HIV/AIDS',
  'Influenza',
  'Malaria',
  'Tuberculosis',
  'Rheumatoid Arthritis',
  'Parkinson\'s Disease',
  'Cystic Fibrosis',
  'Hepatitis C',
  'Multiple Sclerosis',
  'Asthma',
];

interface DockingFormProps {
  form: UseFormReturn<z.infer<typeof dockingSchema>>;
  onSubmit: (values: z.infer<typeof dockingSchema>) => void;
  isLoading: boolean;
}

export function DockingForm({ form, onSubmit, isLoading }: DockingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestedTargets, setSuggestedTargets] = useState<string[]>([]);
  const diseaseKeyword = form.watch('diseaseKeyword');

  const fetchSuggestions = useCallback((keyword?: string) => {
    const effectiveKeyword = keyword || diseaseKeyword;
    if (effectiveKeyword) {
      startTransition(async () => {
        const suggestions = await getProteinSuggestions(effectiveKeyword);
        setSuggestedTargets(suggestions);
      });
    } else {
      setSuggestedTargets([]);
    }
  }, [diseaseKeyword]);

  useEffect(() => {
    // This effect will run when diseaseKeyword changes, but we now trigger manually onSelect.
    // We can keep it for any other potential updates to the keyword.
  }, [diseaseKeyword, fetchSuggestions]);

  const allTargets = [...new Set([...defaultTargets, ...suggestedTargets])];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="smiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Molecule</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a molecule" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <ScrollArea className="h-48">
                            {moleculeOptions.map((mol) => (
                                <SelectItem key={mol.name} value={mol.smiles}>
                                    {mol.name}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
              <FormDescription>Select a common molecule to begin.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="diseaseKeyword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                Find Target by Disease
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  fetchSuggestions(value);
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a disease" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                   <ScrollArea className="h-48">
                    {diseaseOptions.map((disease) => (
                      <SelectItem key={disease} value={disease}>
                        {disease}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <FormDescription>Get AI-powered protein target suggestions.</FormDescription>
               <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="proteinTarget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Protein Target</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={allTargets.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a protein target" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {allTargets.map((target) => (
                      <SelectItem key={target} value={target}>
                        {target}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <FormDescription>Upload not available in this demo.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Running Simulation...' : 'Run Docking'}
        </Button>
      </form>
    </Form>
  );
}
