'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { getProteinSuggestions } from '@/app/actions';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export const dockingSchema = z.object({
  smiles: z.string().min(1, 'SMILES string is required.'),
  proteinTarget: z.string().min(1, 'Protein target is required.'),
  diseaseKeyword: z.string().optional(),
});

const defaultTargets = [
  'Thrombin',
  'Factor Xa',
  'VEGFR2',
  'EGFR',
  'BRD4',
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

  const fetchSuggestions = useCallback(() => {
    if (diseaseKeyword && diseaseKeyword.length >= 3) {
      startTransition(async () => {
        const suggestions = await getProteinSuggestions(diseaseKeyword);
        setSuggestedTargets(suggestions);
      });
    } else {
      setSuggestedTargets([]);
    }
  }, [diseaseKeyword]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions();
    }, 500); // Debounce API calls

    return () => {
      clearTimeout(handler);
    };
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
              <FormLabel>Molecule (SMILES)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., c1ccccc1" {...field} />
              </FormControl>
              <FormDescription>Enter the SMILES string of the ligand.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid gap-3">
          <FormLabel>Find Target by Disease</FormLabel>
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="e.g., Alzheimer's"
              className="pl-8"
              {...form.register('diseaseKeyword')} 
            />
            {isPending && <Loader2 className="absolute right-2.5 top-3 h-4 w-4 animate-spin" />}
          </div>
          <FormDescription>Get AI-powered protein target suggestions.</FormDescription>
        </div>

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
