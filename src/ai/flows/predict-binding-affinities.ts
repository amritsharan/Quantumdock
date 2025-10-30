'use server';

/**
 * @fileOverview Predicts binding affinities based on quantum-refined energies.
 *
 * - predictBindingAffinities - A function that predicts binding affinities.
 * - PredictBindingAffinitiesInput - The input type for the predictBindingAffinities function.
 * - PredictBindingAffinitiesOutput - The return type for the predictBindingAffinities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictBindingAffinitiesInputSchema = z.object({
  quantumRefinedEnergy: z
    .number()
    .describe(
      'The quantum-refined binding energy calculated by VQE or QAOA (in kcal/mol).'
    ),
  moleculeSmiles: z
    .string()
    .describe('The SMILES string representation of the molecule.'),
  proteinTargetName: z
    .string()
    .describe('The name of the protein target the molecule is binding to.'),
});
export type PredictBindingAffinitiesInput = z.infer<
  typeof PredictBindingAffinitiesInputSchema
>;

const PredictBindingAffinitiesOutputSchema = z.object({
  bindingAffinity: z
    .number()
    .describe(
      'The predicted binding affinity (in nM or pM), with lower values indicating higher affinity.'
    ),
  confidenceScore: z
    .number()
    .describe(
      'A confidence score (0 to 1) indicating the reliability of the prediction, with higher values indicating higher confidence.'
    ),
  rationale: z
    .string()
    .describe(
      'A brief rationale explaining the prediction, including any relevant chemical properties or interactions considered.'
    ),
});
export type PredictBindingAffinitiesOutput = z.infer<
  typeof PredictBindingAffinitiesOutputSchema
>;

export async function predictBindingAffinities(
  input: PredictBindingAffinitiesInput
): Promise<PredictBindingAffinitiesOutput> {
  return predictBindingAffinitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictBindingAffinitiesPrompt',
  input: {schema: PredictBindingAffinitiesInputSchema},
  output: {schema: PredictBindingAffinitiesOutputSchema},
  prompt: `You are an expert in drug discovery and molecular interactions. Given the quantum-refined binding energy, molecule SMILES, and protein target name, predict the binding affinity and provide a confidence score and rationale.

Quantum-Refined Binding Energy: {{{quantumRefinedEnergy}}} kcal/mol
Molecule SMILES: {{{moleculeSmiles}}}
Protein Target: {{{proteinTargetName}}}

Consider known interactions, chemical properties, and any relevant data to estimate the binding affinity. The binding affinity should be a number (in nM or pM), the confidence score should be a number between 0 and 1, and the rationale should be a text explanation.

Here's an example of the required JSON output format:
{
    "bindingAffinity": 15.2, 
    "confidenceScore": 0.85,
    "rationale": "The molecule exhibits strong hydrogen bonding with key residues in the binding site, which correlates with the provided quantum energy to indicate a high binding affinity."
}
`,
});

const predictBindingAffinitiesFlow = ai.defineFlow(
  {
    name: 'predictBindingAffinitiesFlow',
    inputSchema: PredictBindingAffinitiesInputSchema,
    outputSchema: PredictBindingAffinitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
