
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { getProteinSuggestions } from '@/app/actions';
import { ScrollArea } from '../ui/scroll-area';
import { dockingSchema } from '@/lib/schema';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

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
    { name: 'Paracetamol (Acetaminophen)', smiles: 'CC(=O)NC1=CC=C(O)C=C1' },
    { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
    { name: 'Metformin', smiles: 'CN(C)C(=N)N=C(N)N' },
    { name: 'Amoxicillin', smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)C(C3=CC=C(O)C=C3)N)C(=O)O)C' },
    { name: 'Diazepam (Valium)', smiles: 'CN1C2=C(C=C(C=C2)Cl)C(=NC1=O)C3=CC=CC=C3' },
    { name: 'Sertraline (Zoloft)', smiles: 'CN[C@H]1CC[C@@H](C2=CC=CC=C12)C3=CC(=C(C=C3)Cl)Cl' },
    { name: 'Lisinopril', smiles: 'C[C@H](N)C(=O)N1CCC[C@H]1C(=O)N[C@@H](CCCCN)C(=O)O' },
    { name: 'Atorvastatin (Lipitor)', smiles: 'CC(C)c1c(c(n(c1c2ccc(cc2)F)C(C)C)CC[C@H](C[C@H](CC(=O)O)O)O)c3ccccc3' },
    { name: 'Imatinib (Gleevec)', smiles: 'Cc1ccc(cc1)c2cc(c(cn2)Nc3ncc(c(n3)C)-c4cccc(c4)C(F)(F)F)C(=O)N5CCN(CC5)C' },
    { name: 'Penicillin G', smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C' },
    { name: 'Ciprofloxacin', smiles: 'C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O' },
    { name: 'Warfarin', smiles: 'CC(=O)CC(C1=C(C=CC=C1)O)C2=C(C(=O)OC3=CC=CC=C23)O' },
    { name: 'Theophylline', smiles: 'CN1C=NC2=C1C(=O)NC(=O)N2C' },
    { name: 'Dopamine', smiles: 'C1=CC(=C(C=C1CCN)O)O' },
    { name: 'Serotonin', smiles: 'C1=CC=C2C(=C1)C(=CN2)CCN' },
    { name: 'Adrenaline (Epinephrine)', smiles: 'CNC[C@H](C1=CC(=C(C=C1)O)O)O' },
    { name: 'Glucose', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O)O' },
    { name: 'Fructose', smiles: 'C(C1C(C(C(O1)(CO)O)O)O)O' },
    { name: 'Sucrose', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)OC2(C(C(C(O2)CO)O)O)CO' },
    { name: 'Cholesterol', smiles: 'CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C' },
    { name: 'Testosterone', smiles: 'C[C@H]1CC[C@H]2[C@@H]3CCC4=CC(=O)CC[C@]4(C)[C@H]3CC[C@]12C' },
    { name: 'Estradiol', smiles: 'C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=C3C=CC(=C4)O' },
    { name: 'Benzene', smiles: 'c1ccccc1' },
    { name: 'Ethanol', smiles: 'CCO' },
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
  const [popoverOpen, setPopoverOpen] = useState(false)

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
            <FormItem className="flex flex-col">
              <FormLabel>Molecule</FormLabel>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? moleculeOptions.find(
                            (mol) => mol.smiles === field.value
                          )?.name
                        : "Select a molecule"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search molecule..." />
                    <CommandList>
                      <CommandEmpty>No molecule found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-48">
                          {moleculeOptions.map((mol) => (
                            <CommandItem
                              value={mol.name}
                              key={mol.smiles}
                              onSelect={() => {
                                form.setValue("smiles", mol.smiles)
                                setPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  mol.smiles === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {mol.name}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Search or select a molecule to begin.</FormDescription>
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
