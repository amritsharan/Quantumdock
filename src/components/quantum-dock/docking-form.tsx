
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { getProteinSuggestions } from '@/app/actions';
import { ScrollArea } from '../ui/scroll-area';
import { dockingSchema } from '@/lib/schema';
import { Card, CardContent } from '../ui/card';
import { molecules } from '@/lib/molecules';


const defaultTargets = [
  'Thrombin',
  'Factor Xa',
  'VEGFR2',
  'EGFR',
  'BRD4',
];

const diseaseOptions = [
  "Alzheimer's Disease",
  "Amyotrophic Lateral Sclerosis (ALS)",
  "Ankylosing Spondylitis",
  "Asthma",
  "Atrial Fibrillation",
  "Autism Spectrum Disorder",
  "Bipolar Disorder",
  "Breast Cancer",
  "Chronic Kidney Disease",
  "Chronic Obstructive Pulmonary Disease (COPD)",
  "Colorectal Cancer",
  "Coronary Artery Disease",
  "Crohn's Disease",
  "Cystic Fibrosis",
  "Dementia",
  "Depression",
  "Diabetes (Type 1)",
  "Diabetes (Type 2)",
  "Eczema (Atopic Dermatitis)",
  "Endometriosis",
  "Epilepsy",
  "Fibromyalgia",
  "Glioblastoma",
  "Gout",
  "Graves' Disease",
  "Hashimoto's Thyroiditis",
  "Heart Failure",
  "Hepatitis C",
  "HIV/AIDS",
  "Huntington's Disease",
  "Hypertension",
  "Influenza",
  "Leukemia",
  "Liver Cancer",
  "Lung Cancer",
  "Lupus (Systemic Lupus Erythematosus)",
  "Lymphoma",
  "Macular Degeneration",
  "Malaria",
  "Melanoma",
  "Multiple Sclerosis",
  "Myocardial Infarction",
  "Obsessive-Compulsive Disorder (OCD)",
  "Osteoarthritis",
  "Osteoporosis",
  "Ovarian Cancer",
  "Pancreatic Cancer",
  "Parkinson's Disease",
  "Post-Traumatic Stress Disorder (PTSD)",
  "Prostate Cancer",
  "Psoriasis",
  "Rheumatoid Arthritis",
  "Schizophrenia",
  "Sickle Cell Anemia",
  "Skin Cancer",
  "Stomach Cancer",
  "Stroke",
  "Tuberculosis",
  "Ulcerative Colitis",
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
  
  const selectedSmiles = form.watch('smiles') || [];
  const selectedMolecules = molecules.filter(m => selectedSmiles.includes(m.smiles));

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
                    <Link href="/select-molecule">
                        {selectedMolecules.length > 0 ? 'Change Selection' : 'Select Molecules'}
                    </Link>
                </Button>
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

        <Button type="submit" disabled={isLoading || selectedMolecules.length === 0} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Running Simulation...' : `Run Docking for ${selectedMolecules.length} Molecule(s)`}
        </Button>
      </form>
    </Form>
  );
}
