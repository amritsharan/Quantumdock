
import { z } from 'zod';
import type { PredictBindingAffinitiesOutput } from '@/ai/flows/predict-binding-affinities';

export const dockingSchema = z.object({
  smiles: z.array(z.string()).min(1, "At least one molecule must be selected."),
  proteinTargets: z.array(z.string()).min(1, "At least one protein target must be selected."),
  diseaseKeywords: z.array(z.string()).optional(),
});

export type DockingInput = z.infer<typeof dockingSchema>;

// This now correctly includes all fields from the AI's output.
export type DockingResults = PredictBindingAffinitiesOutput & {
  proteinTarget: string;
  moleculeSmiles: string;
  // The fields from the 'comparison' object are now nested, matching the AI output
};
