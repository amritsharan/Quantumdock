
'use server';

import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';
import { predictBindingAffinities, type PredictBindingAffinitiesInput, type PredictBindingAffinitiesOutput } from '@/ai/flows/predict-binding-affinities';


/**
 * [SIMULATION] Simulates running a classical docking tool like AutoDock Vina.
 * @returns A promise that resolves with a docking score.
 */
async function runClassicalDocking(smile: string, protein: string): Promise<number> {
  console.log(`[SIMULATION] Running classical docking for ${smile} and ${protein}...`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const baseScore = -5;
  const smileContribution = (smile.length % 10) * 0.3; 
  const proteinContribution = (protein.length % 10) * 0.2;
  const mockScore = baseScore - smileContribution - proteinContribution;
  console.log(`[SIMULATION] Classical docking complete. Score: ${mockScore}`);
  return mockScore;
}


/**
 * [SIMULATION] Simulates a quantum refinement step.
 * @param classicalScore The score from the classical docking.
 * @returns A promise that resolves with a mock quantum-refined energy.
 */
async function runQuantumRefinementSimulation(classicalScore: number): Promise<number> {
    console.log(`[SIMULATION] Simulating quantum refinement...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockQuantumRefinedEnergy = classicalScore - 1.25; 
    console.log(`[SIMULATION] Quantum refinement complete. Energy: ${mockQuantumRefinedEnergy}`);
    return mockQuantumRefinedEnergy;
}


export async function runFullDockingProcess(
    data: DockingInput, 
    userId: string, 
    onProgress: (step: 'classifying' | 'refining' | 'predicting') => void
): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const successfulResults: DockingResults[] = [];

  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      try {
        console.log(`Processing combination: ${smile} + ${protein}`);
        
        onProgress('classifying');
        const classicalScore = await runClassicalDocking(smile, protein);
        
        onProgress('refining');
        const quantumRefinedEnergy = await runQuantumRefinementSimulation(classicalScore);
        
        onProgress('predicting');
        const predictionInput: PredictBindingAffinitiesInput = {
            quantumRefinedEnergy: quantumRefinedEnergy,
            moleculeSmiles: smile,
            proteinTargetName: protein,
        };

        const predictionResult = await predictBindingAffinities(predictionInput);

        const finalResult: DockingResults = {
          bindingAffinity: predictionResult.bindingAffinity,
          confidenceScore: predictionResult.confidenceScore,
          rationale: predictionResult.rationale,
          comparison: predictionResult.comparison,
          moleculeSmiles: smile,
          proteinTarget: protein,
        };
        successfulResults.push(finalResult);

      } catch (error) {
         console.error(`Error processing combination: ${smile} + ${protein}. Error:`, error);
         throw new Error("An unexpected internal error occurred during the simulation.");
      }
    }
  }

  if (successfulResults.length === 0 && validatedData.smiles.length > 0 && validatedData.proteinTargets.length > 0) {
      throw new Error("All docking simulations failed. Please check the server logs for more details.");
  }

  return successfulResults;
}

export async function getProteinSuggestions(keywords: string[]): Promise<string[]> {
  if (!keywords || keywords.length === 0) {
    return [];
  }
  try {
    const suggestionsPromises = keywords.map(keyword => suggestTargetProteins({ keyword }));
    const results = await Promise.all(suggestionsPromises);
    const allProteins = results.flatMap(result => result.proteins || []);
    return [...new Set(allProteins)];
  } catch (error) {
    console.error("Error suggesting proteins:", error);
    return [];
  }
}
