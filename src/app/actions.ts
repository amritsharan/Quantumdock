
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';

// Helper function for retrying promises with exponential backoff
async function retryPromise<T>(fn: () => Promise<T>, retries = 3, delay = 1000, finalErr: string = 'Failed after multiple retries'): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
        console.log(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay * (i + 1)));
      } else {
        break;
      }
    }
  }
  if (lastError && (lastError.message.includes('503') || lastError.message.toLowerCase().includes('overloaded'))) {
      throw new Error("The AI model is currently overloaded. Please try the simulation again in a few moments.");
  }
  throw lastError || new Error(finalErr);
}

/**
 * Simulates running a classical docking tool like AutoDock.
 * In a real application, this would be a call to a separate backend service.
 * @returns A promise that resolves with a mock classical docking score.
 */
async function runClassicalDocking(smile: string, protein: string): Promise<number> {
  console.log(`Running classical docking for ${smile} and ${protein}...`);
  // Simulate network latency and computation time for a real docking job.
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  // Return a mock score, typically a negative value indicating binding energy (e.g., in kcal/mol).
  const mockScore = -5 - (Math.random() * 5); 
  console.log(`Classical docking complete for ${smile} and ${protein}. Score: ${mockScore}`);
  return mockScore;
}


export async function runFullDockingProcess(data: DockingInput): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const predictionPromises: Promise<DockingResults>[] = [];

  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      const promise = runClassicalDocking(smile, protein)
        .then(classicalScore => {
            // The quantum refinement simulation improves upon the classical score.
            const mockQuantumRefinedEnergy = classicalScore - (Math.random() * 2); // Makes it slightly better

            const predictionInput = {
                quantumRefinedEnergy: mockQuantumRefinedEnergy,
                moleculeSmiles: smile,
                proteinTargetName: protein,
            };

            return retryPromise(() => predictBindingAffinities(predictionInput));
        })
        .then(predictionResult => {
          if (!predictionResult || typeof predictionResult.bindingAffinity !== 'number') {
            throw new Error(`Failed to get a valid binding affinity prediction for ${smile} with ${protein}.`);
          }
          return {
            ...predictionResult,
            moleculeSmiles: smile,
            proteinTarget: protein,
          };
        });
      
      predictionPromises.push(promise);
    }
  }
  
  const results = await Promise.allSettled(predictionPromises);

  const successfulResults: DockingResults[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulResults.push(result.value);
    } else {
        const smile = validatedData.smiles[Math.floor(index / validatedData.proteinTargets.length)];
        const protein = validatedData.proteinTargets[index % validatedData.proteinTargets.length];
        console.error(`Error processing combination: ${smile} + ${protein}. Error:`, result.reason);
    }
  });

  if (successfulResults.length === 0 && results.length > 0) {
      const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (firstError) {
        throw firstError.reason;
      }
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
