
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { z } from 'zod';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';

// Helper function for retrying promises with exponential backoff
async function retryPromise<T>(fn: () => Promise<T>, retries = 3, delay = 1000, finalErr: string = 'Failed after multiple retries'): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check for specific 503 error to retry
      if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
        console.log(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay * (i + 1))); // Incremental delay
      } else {
        // Don't retry on other errors
        break;
      }
    }
  }
  // If all retries fail, throw a more specific error
  if (lastError && (lastError.message.includes('503') || lastError.message.toLowerCase().includes('overloaded'))) {
      throw new Error("The AI model is currently overloaded. Please try the simulation again in a few moments.");
  }
  throw lastError || new Error(finalErr);
}

export async function runFullDockingProcess(data: DockingInput): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const allResults: DockingResults[] = [];

  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      const mockQuantumRefinedEnergy = -7.5 + (Math.random() * -3);

      const predictionInput = {
        quantumRefinedEnergy: mockQuantumRefinedEnergy,
        moleculeSmiles: smile,
        proteinTargetName: protein,
      };

      try {
        const predictionResult = await retryPromise(() => predictBindingAffinities(predictionInput));

        if (!predictionResult || typeof predictionResult.bindingAffinity !== 'number') {
          throw new Error(`Failed to get a valid binding affinity prediction for ${smile} with ${protein}.`);
        }

        allResults.push({
          ...predictionResult,
          moleculeSmiles: smile,
          proteinTarget: protein,
        });

      } catch (error) {
          console.error(`Error processing combination: ${smile} + ${protein}. Error:`, error);
          // Re-throw the specific error to be displayed on the client
          throw error;
      }
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
    return [...new Set(allProteins)];
  } catch (error) {
    console.error("Error suggesting proteins:", error);
    return [];
  }
}
