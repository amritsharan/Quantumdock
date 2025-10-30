
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { refineDockingPosesWithVQE } from '@/ai/flows/refine-docking-poses-with-vqe';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { z } from 'zod';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';

export async function runFullDockingProcess(data: DockingInput): Promise<DockingResults[]> {
  // 1. Validate the full input against the main schema
  const validatedData = dockingSchema.parse(data);

  const allResults: DockingResults[] = [];

  // 2. Iterate through each molecule and each protein target to create all combinations
  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
        
      // 3. Simulate Classical Docking and Quantum Refinement for each combination
      // In a real application, this would involve complex computations.
      // Here, we just call the flows with mock data to simulate the process.
      
      const mockLigandPoseData = 'data:text/plain;base64,' + Buffer.from('mock ligand data from classical docking').toString('base64');
      
      await refineDockingPosesWithVQE({
        proteinStructure: 'mock protein data in PDB format for ' + protein,
        ligandPose: mockLigandPoseData,
        numPosesToRefine: 5,
      });

      // 4. Predict Binding Affinities for each combination
      // We use a random value to simulate the output of the VQE calculation.
      const mockQuantumRefinedEnergy = -7.5 + (Math.random() * -3); // Random realistic-ish energy in kcal/mol

      const predictionInput = {
        quantumRefinedEnergy: mockQuantumRefinedEnergy,
        moleculeSmiles: smile,
        proteinTargetName: protein,
      };

      const predictionResult = await predictBindingAffinities(predictionInput);
      
      if (!predictionResult || typeof predictionResult.bindingAffinity !== 'number') {
        throw new Error(`Failed to predict binding affinities for ${smile} with ${protein}.`);
      }

      // 5. Add the combined result to our results array
      allResults.push({
          ...predictionResult,
          moleculeSmiles: smile,
          proteinTarget: protein,
      });
    }
  }

  return allResults;
}

export async function getProteinSuggestions(keywords: string[]): Promise<string[]> {
  if (!keywords || keywords.length === 0) {
      return [];
  }
  try {
      const suggestionsPromises = keywords.map(keyword => suggestTargetProteins({ keyword }));
      const results = await Promise.all(suggestionsPromises);
      const allProteins = results.flatMap(result => result.proteins || []);
      // Return unique proteins
      return [...new Set(allProteins)];
  } catch (error) {
      console.error("Error suggesting proteins:", error);
      // In case of an API error, return an empty array to prevent UI crashing.
      return [];
  }
}
