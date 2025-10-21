
'use server';

import { predictBindingAffinities, type PredictBindingAffinitiesOutput } from '@/ai/flows/predict-binding-affinities';
import { refineDockingPosesWithVQE } from '@/ai/flows/refine-docking-poses-with-vqe';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { z } from 'zod';

export const dockingSchema = z.object({
  smiles: z.string().min(1, "SMILES string is required."),
  proteinTarget: z.string().min(1, "Protein target is required."),
  diseaseKeyword: z.string().optional(),
});

export type DockingInput = z.infer<typeof dockingSchema>;
export type DockingResults = PredictBindingAffinitiesOutput;


export async function runFullDockingProcess(data: DockingInput): Promise<DockingResults> {
  // 1. Validate input
  const validatedData = dockingSchema.parse(data);

  // 2. Simulate Classical Docking and Quantum Refinement
  // In a real application, this would involve complex computations.
  // Here, we just call the flows with mock data to simulate the process.
  
  // The refineDockingPosesWithVQE flow requires a data URI for the ligand pose.
  const mockLigandPoseData = 'data:text/plain;base64,' + Buffer.from('mock ligand data from classical docking').toString('base64');
  
  await refineDockingPosesWithVQE({
    proteinStructure: 'mock protein data in PDB format',
    ligandPose: mockLigandPoseData,
    numPosesToRefine: 5,
  });

  // 3. Predict Binding Affinities
  // We use a random value to simulate the output of the VQE calculation.
  const mockQuantumRefinedEnergy = -7.5 + (Math.random() * -3); // Random realistic-ish energy in kcal/mol

  const predictionInput = {
    quantumRefinedEnergy: mockQuantumRefinedEnergy,
    moleculeSmiles: validatedData.smiles,
    proteinTargetName: validatedData.proteinTarget,
  };

  const results = await predictBindingAffinities(predictionInput);
  
  if (!results || typeof results.bindingAffinity !== 'number') {
    throw new Error('Failed to predict binding affinities.');
  }

  return results;
}

export async function getProteinSuggestions(keyword: string): Promise<string[]> {
  if (!keyword || keyword.trim().length < 3) {
      return [];
  }
  try {
      const result = await suggestTargetProteins({ keyword });
      return result.proteins || [];
  } catch (error) {
      console.error("Error suggesting proteins:", error);
      // In case of an API error, return an empty array to prevent UI crashing.
      return [];
  }
}
