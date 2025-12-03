
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
  classicalDockingScore: z
    .number()
    .describe(
      'The docking score from a classical model (e.g., AutoDock Vina), typically in kcal/mol. More negative is better.'
    ),
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
    .min(0)
    .max(1)
    .describe(
      'A confidence score (from 0.0 to 1.0) indicating the reliability of the prediction.'
    ),
  rationale: z
    .string()
    .describe(
      'A brief rationale explaining the prediction, including any relevant chemical properties or interactions considered.'
    ),
    comparison: z.object({
      gnnModelScore: z.number().describe('A fictional binding affinity score (in nM) from a simulated Graph Neural Network (GNN) model for comparison.'),
      explanation: z.string().describe('A brief explanation comparing the AI prediction to the GNN model score, explaining potential reasons for any discrepancies (e.g., sensitivity to quantum effects).'),
    }),
    timing: z.object({
      quantumModelTime: z.number().describe('Simulated docking time in seconds for the quantum-assisted model. This should generally be faster than the GNN model.'),
      gnnModelTime: z.number().describe('Simulated docking time in seconds for the GNN model. This should generally be slower than the quantum model, especially for complex molecules.'),
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

const predictBindingAffinitiesFlow = ai.defineFlow(
  {
    name: 'predictBindingAffinitiesFlow',
    inputSchema: PredictBindingAffinitiesInputSchema,
    outputSchema: PredictBindingAffinitiesOutputSchema,
  },
  async input => {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `You are an expert computational chemist specializing in quantum-assisted drug discovery. Your task is to analyze simulated docking results and provide a comprehensive, scientific prediction. Your results must be deterministic based on the inputs.

You will be given:
1.  A classical docking score (e.g., from AutoDock Vina) in kcal/mol.
2.  A simulated quantum-refined binding energy (in kcal/mol). This represents the final energy state of the molecule-protein complex after quantum refinement.
3.  A molecule's SMILES string.
4.  A protein target's name.

Your tasks are:
1.  **Predict Binding Affinity:** Based on all inputs, predict the binding affinity in nM. A lower (more negative) classical and quantum-refined energy should generally correlate with a lower (stronger) binding affinity. The quantum energy is a more precise measure. This result must be deterministic.
2.  **Provide a Confidence Score:** Give a confidence score from 0.0 to 1.0 for your prediction. This result must be deterministic.
3.  **Generate Rationale:** Explain your reasoning for the prediction in a scientifically rigorous manner.
4.  **Provide Comparison:** Under a 'comparison' object, provide the following:
    - **gnnModelScore:** Generate a *fictional* binding affinity score that a Graph Neural Network (GNN) model might predict. This should be plausible but slightly different from your own prediction. This result must be deterministic.
    - **explanation:** Write a brief explanation for why our quantum-informed prediction might differ from the GNN's score. Mention sensitivity to quantum effects.
5.  **Provide Timing:** Under a 'timing' object, provide the following:
    - **quantumModelTime:** Generate a *fictional* docking time in seconds. This should be a relatively low number.
    - **gnnModelTime:** Generate a *fictional* docking time in seconds for the GNN model. This value should be plausibly *slower* than the quantumModelTime, reflecting the quantum model's efficiency.

**Simulated Inputs:**
- Classical Docking Score: ${input.classicalDockingScore} kcal/mol
- Quantum-Refined Binding Energy: ${input.quantumRefinedEnergy} kcal/mol
- Molecule SMILES: ${input.moleculeSmiles}
- Protein Target: ${input.proteinTargetName}

Please provide the output in the required JSON format.`,
      output: {
        schema: PredictBindingAffinitiesOutputSchema,
      },
    });

    return llmResponse.output()!;
  }
);

    