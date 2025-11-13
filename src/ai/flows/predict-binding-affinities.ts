
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
      'A simulated quantum-refined binding energy (in kcal/mol). In a real scenario, this would come from a VQE or QAOA calculation.'
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
      'A confidence score (from 0.70 to 0.85) indicating the reliability of the prediction. It must be a value between 0.70 and 0.85.'
    ),
  rationale: z
    .string()
    .describe(
      'A brief rationale explaining the prediction, including any relevant chemical properties or interactions considered.'
    ),
    comparison: z.object({
      standardModelScore: z.number().describe('A fictional binding affinity score (in nM) from a simulated advanced ML model (e.g., a GNN) for comparison.'),
      explanation: z.string().describe('A brief explanation comparing the AI prediction to the advanced model score, explaining potential reasons for any discrepancies (e.g., sensitivity to quantum effects).'),
    }),
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
  prompt: `You are an expert computational chemist specializing in quantum-assisted drug discovery. Your task is to analyze simulated docking results and provide a comprehensive, scientific prediction. The results must be deterministic for the given inputs.

You will be given:
1.  A simulated quantum-refined binding energy (in kcal/mol). This represents the final energy state of the molecule-protein complex after quantum refinement.
2.  A molecule's SMILES string.
3.  A protein target's name.

Your tasks are:
1.  **Predict Binding Affinity:** Based on the inputs, predict the binding affinity in nM. A lower (more negative) quantum-refined energy should generally correlate with a lower (stronger) binding affinity. This result must be deterministic.
2.  **Provide a Confidence Score:** Give a confidence score from 0.70 to 0.85 for your prediction. This value MUST be between 0.70 and 0.85, inclusive. This result must be deterministic.
3.  **Generate Rationale:** Explain your reasoning for the prediction in a scientifically rigorous manner.
4.  **Provide Comparison:** Under a 'comparison' object, provide the following:
    - **standardModelScore:** Generate a *fictional* binding affinity score that a conventional, advanced ML model (like a Graph Neural Network) might predict. This should be plausible but slightly different from your own prediction.
    - **explanation:** Write a brief explanation for why our quantum-informed prediction might differ from the advanced model's score. Mention sensitivity to quantum effects.


**Simulated Inputs:**
- Quantum-Refined Binding Energy: {{{quantumRefinedEnergy}}} kcal/mol
- Molecule SMILES: {{{moleculeSmiles}}}
- Protein Target: {{{proteinTargetName}}}

Please provide the output in the required JSON format.
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
