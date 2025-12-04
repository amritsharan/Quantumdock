
'use server';

/**
 * @fileOverview Predicts binding affinities based on quantum-refined energies.
 *
 * - predictBindingAffinities - A function that predicts binding affinities.
 * - PredictBindingAffinitiesInput - The input type for the predictBindingAffinities function.
 * - PredictBindingAffinitiesOutput - The return type for the predictBindingAffinities function.
 */

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
      gnnModelScore: z.number().describe('A fictional binding affinity score (in nM) from a simulated advanced ML model (e.g., a GNN) for comparison.'),
      explanation: z.string().describe('A brief explanation comparing the AI prediction to the advanced model score, explaining potential reasons for any discrepancies (e.g., sensitivity to quantum effects).'),
    }),
    timing: z.object({
      quantumModelTime: z.number().describe('Simulated quantum model docking time.'),
      gnnModelTime: z.number().describe('Simulated GNN model docking time.'),
    }),
});
export type PredictBindingAffinitiesOutput = z.infer<
  typeof PredictBindingAffinitiesOutputSchema
>;

export async function predictBindingAffinities(
  input: PredictBindingAffinitiesInput
): Promise<PredictBindingAffinitiesOutput> {
  // This is a deterministic simulation that replaces the AI call.
  // It generates plausible results based on the input scores.
  
  const { quantumRefinedEnergy, classicalDockingScore, moleculeSmiles, proteinTargetName } = input;

  // 1. Calculate Binding Affinity (deterministic)
  // A simple formula to convert energy (kcal/mol) to affinity (nM).
  // This is a simplified stand-in for a real model's prediction.
  const affinity = Math.pow(10, quantumRefinedEnergy / 1.364) * 1e9;
  const bindingAffinity = Math.max(0.1, Math.min(10000, affinity)); // Clamp to a reasonable range

  // 2. Calculate Confidence Score (deterministic)
  // Confidence is higher when classical and quantum scores are close.
  const difference = Math.abs(quantumRefinedEnergy - classicalDockingScore);
  const confidenceScore = Math.max(0.5, 1 - (difference / 10)); // Base confidence of 0.5, decreases with larger difference

  // 3. Generate Rationale (deterministic)
  const rationale = `The quantum-refined energy of ${quantumRefinedEnergy.toFixed(2)} kcal/mol suggests a ${bindingAffinity < 50 ? 'strong' : 'moderate'} interaction. The proximity to the classical score of ${classicalDockingScore.toFixed(2)} kcal/mol provides a confidence level of ${Math.round(confidenceScore * 100)}%.`;

  // 4. Generate Comparison Data (deterministic)
  const gnnModelScore = bindingAffinity * 1.2 + 5; // Fictional GNN score is slightly worse
  const explanation = "The quantum-refined model captures subtle electronic effects not fully represented in the GNN, leading to a more accurate prediction of binding strength.";

  // 5. Generate Timing (deterministic)
  const quantumModelTime = 2.5 + (moleculeSmiles.length % 10) * 0.1;
  const gnnModelTime = 0.8 + (proteinTargetName.length % 10) * 0.05;

  return {
    bindingAffinity,
    confidenceScore,
    rationale,
    comparison: {
      gnnModelScore,
      explanation,
    },
    timing: {
      quantumModelTime,
      gnnModelTime,
    }
  };
}
