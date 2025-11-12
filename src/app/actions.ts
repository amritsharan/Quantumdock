
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';
import type { PredictBindingAffinitiesInput } from '@/ai/flows/predict-binding-affinities';


/**
 * A robust wrapper for the `predictBindingAffinities` AI call that includes
 * retry logic with exponential backoff. This is essential for handling
 * transient server errors like 503 (Service Unavailable) or 429 (Rate Limiting).
 * @param input The input for the AI prediction.
 * @param retries The number of times to retry the request.
 * @param delay The initial delay between retries, which will be doubled on each subsequent attempt.
 * @returns A promise that resolves with the prediction result.
 * @throws An error if the request fails after all retry attempts.
 */
async function predictWithRetry(input: PredictBindingAffinitiesInput, retries = 5, delay = 2000) {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      // Attempt to get the prediction
      const result = await predictBindingAffinities(input);
      if (!result || typeof result.bindingAffinity !== 'number') {
        throw new Error('Invalid response from prediction model.');
      }
      return result; // Success, return the result
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message.toLowerCase();
      // Check for specific, retry-able error messages from the AI service
      if (errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('overloaded') || errorMessage.includes('rate limit')) {
        // If it's a retry-able error, wait and then continue to the next loop iteration
        console.log(`Attempt ${i + 1} failed with transient error. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      } else {
        // If the error is not a transient one, break the loop and re-throw immediately
        console.error("Non-retryable error during prediction:", error);
        throw error;
      }
    }
  }

  // If the loop completes without a successful return, it means all retries failed.
  // We throw a user-friendly error.
  console.error("All retry attempts failed. Last error:", lastError);
  throw new Error("The AI model is currently overloaded. Please try again in a few moments.");
}


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
    console.log(`[SIMULATION] Running quantum refinement simulation...`);
    const mockQuantumRefinedEnergy = classicalScore - 1.25; 
    return mockQuantumRefinedEnergy;
}


export async function runFullDockingProcess(data: DockingInput, userId: string): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const successfulResults: DockingResults[] = [];

  // Process each combination sequentially to avoid overwhelming the AI service
  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      try {
        console.log(`Processing combination: ${smile} + ${protein}`);
        const classicalScore = await runClassicalDocking(smile, protein);
        const quantumRefinedEnergy = await runQuantumRefinementSimulation(classicalScore);
        
        const predictionInput = {
            quantumRefinedEnergy: quantumRefinedEnergy,
            moleculeSmiles: smile,
            proteinTargetName: protein,
        };

        // Use the new robust retry mechanism for the AI call
        const predictionResult = await predictWithRetry(predictionInput);

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
         // Propagate the error to the client to be displayed in a toast
         throw error;
      }
    }
  }

  // This check is important. If the loops were entered but no results were successful, it's an issue.
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
    // This can still run in parallel as it's less intensive and less likely to fail
    const suggestionsPromises = keywords.map(keyword => predictWithRetry({ keyword } as any));
    const results = await Promise.all(suggestionsPromises);
    const allProteins = results.flatMap((result: any) => result.proteins || []);
    return [...new Set(allProteins)];
  } catch (error) {
    console.error("Error suggesting proteins:", error);
    // Return empty array on failure to prevent crashing the selection page
    return [];
  }
}
