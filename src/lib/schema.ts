import { z } from 'zod';
import type { PredictBindingAffinitiesOutput } from '@/ai/flows/predict-binding-affinities';

export const dockingSchema = z.object({
  smiles: z.string().min(1, "SMILES string is required."),
  proteinTarget: z.string().min(1, "Protein target is required."),
  diseaseKeyword: z.string().optional(),
});

export type DockingInput = z.infer<typeof dockingSchema>;
export type DockingResults = PredictBindingAffinitiesOutput;
