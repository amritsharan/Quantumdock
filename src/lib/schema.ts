
import { z } from 'zod';
import type { PredictBindingAffinitiesOutput } from '@/ai/flows/predict-binding-affinities';

export const dockingSchema = z.object({
  smiles: z.array(z.string()).min(1, "At least one molecule must be selected."),
  proteinTargets: z.array(z.string()).min(1, "At least one protein target must be selected."),
  diseaseKeywords: z.array(z.string()).optional(),
});

export type DockingInput = z.infer<typeof dockingSchema>;

export type DockingResults = PredictBindingAffinitiesOutput & {
  proteinTarget: string;
  moleculeSmiles: string;
};

export type ResearchComparisonInput = z.infer<typeof ResearchComparisonInputSchema>;

const ResearchComparisonInputSchema = z.array(z.object({
    moleculeSmiles: z.string(),
    proteinTarget: z.string(),
    bindingAffinity: z.number(),
    confidenceScore: z.number(),
    rationale: z.string(),
    standardModelScore: z.number(),
    aiCommentary: z.string(),
}));
    