
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
    standardModelScore: z.number().describe('A fictional binding affinity score (in nM) from a simulated standard ML model (e.g., a GNN) for comparison.'),
    aiCommentary: z.string().describe('A brief commentary comparing the AI prediction to the standard model score, explaining potential reasons for any discrepancies (e.g., sensitivity to quantum effects).'),
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
  prompt: `You are an expert in drug discovery and molecular interactions. Your task is to analyze simulated docking results and provide a comprehensive prediction.

You will be given:
1.  A simulated quantum-refined binding energy.
2.  A molecule's SMILES string.
3.  A protein target's name.

Your tasks are:
1.  **Predict Binding Affinity:** Based on the inputs, predict the binding affinity in nM.
2.  **Provide a Confidence Score:** Give a confidence score from 0.70 to 0.85 for your prediction. This value MUST be between 0.70 and 0.85, inclusive.
3.  **Generate Rationale:** Explain your reasoning for the prediction.
4.  **Simulate a Standard Model Score:** Generate a *fictional* binding affinity score that a conventional ML model (like a Graph Neural Network) might predict. This should be plausible but slightly different from your own prediction.
5.  **Provide AI Commentary:** Write a brief commentary explaining why your quantum-informed prediction might differ from the standard model's score. For example, you could mention that your model is more sensitive to subtle quantum-level interactions that classical models might miss.

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
