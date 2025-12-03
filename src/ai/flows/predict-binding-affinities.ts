
'use server';

/**
 * @fileOverview Predicts binding affinities based on quantum-refined energies.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// -----------------------
// INPUT SCHEMA
// -----------------------
const PredictBindingAffinitiesInputSchema = z.object({
  classicalDockingScore: z
    .number()
    .describe(
      'The docking score from a classical model (e.g., AutoDock Vina), typically in kcal/mol. More negative is better.'
    ),

  quantumRefinedEnergy: z
    .number()
    .describe(
      'A simulated quantum-refined binding energy (in kcal/mol).'
    ),

  moleculeSmiles: z
    .string()
    .describe('The SMILES string representation of the molecule.'),

  proteinTargetName: z
    .string()
    .describe('The protein target the molecule is binding to.'),
});

export type PredictBindingAffinitiesInput = z.infer<
  typeof PredictBindingAffinitiesInputSchema
>;

// -----------------------
// OUTPUT SCHEMA
// -----------------------
const PredictBindingAffinitiesOutputSchema = z.object({
  bindingAffinity: z.number().describe('Predicted binding affinity.'),

  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score for prediction.'),

  rationale: z
    .string()
    .describe('Scientific rationale behind the prediction.'),

  comparison: z.object({
    gnnModelScore: z.number().describe('Fictional GNN model score.'),
    explanation: z
      .string()
      .describe('Why the quantum model differs from the GNN model.'),
  }),

  timing: z.object({
    quantumModelTime: z.number().describe('Simulated quantum model docking time.'),
    gnnModelTime: z.number().describe('Simulated GNN model docking time.'),
  }),
});

export type PredictBindingAffinitiesOutput = z.infer<
  typeof PredictBindingAffinitiesOutputSchema
>;

// -----------------------
// EXPORT FUNCTION
// -----------------------
export async function predictBindingAffinities(
  input: PredictBindingAffinitiesInput
): Promise<PredictBindingAffinitiesOutput> {
  return predictBindingAffinitiesFlow(input);
}

// -----------------------
// PROMPT
// -----------------------
const prompt = ai.definePrompt({
  name: 'predictBindingAffinitiesPrompt',
  input: { schema: PredictBindingAffinitiesInputSchema },
  output: { schema: PredictBindingAffinitiesOutputSchema },
  model: 'gemini-pro',
  output: {
    format: 'json'
  },
  prompt: `
You are an expert computational chemist specializing in quantum-assisted drug discovery.
Analyze the provided inputs and return a deterministic JSON prediction.

Inputs:
- Classical Docking Score: {{classicalDockingScore}} kcal/mol
- Quantum-Refined Energy: {{quantumRefinedEnergy}} kcal/mol
- Molecule SMILES: {{moleculeSmiles}}
- Protein Target: {{proteinTargetName}}

Tasks:
1. Predict deterministic binding affinity (nM).
2. Provide deterministic confidence score (0–1).
3. Provide reasoning.
4. Provide a comparison object:
   - gnnModelScore (fictional)
   - explanation
5. Provide timing object:
   - quantumModelTime
   - gnnModelTime

Return valid JSON only.
  `,
});

// -----------------------
// FLOW
// -----------------------
const predictBindingAffinitiesFlow = ai.defineFlow(
  {
    name: 'predictBindingAffinitiesFlow',
    inputSchema: PredictBindingAffinitiesInputSchema,
    outputSchema: PredictBindingAffinitiesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
