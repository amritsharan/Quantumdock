
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';


// Helper function for retrying promises with exponential backoff
export async function retryPromise<T>(fn: () => Promise<T>, retries = 5, delay = 2000, finalErr: string = 'Failed after multiple retries'): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check for common transient error messages (503, 429, overloaded)
      if (error.message && (error.message.includes('503') || error.message.includes('429') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('rate limit'))) {
        console.log(`Attempt ${i + 1} failed with transient error. Retrying in ${delay * (i + 1)}ms...`);
        await new Promise(res => setTimeout(res, delay * (i + 1)));
      } else {
        // If the error is not a known retryable one, break the loop immediately.
        break;
      }
    }
  }
   if (lastError && (lastError.message.includes('503') || lastError.message.toLowerCase().includes('overloaded')  || lastError.message.includes('429'))) {
      throw new Error("The AI model is currently overloaded or rate-limited. Please try again in a few moments.");
  }
  // If the loop finished because of a non-retryable error, throw that error.
  // Otherwise, throw the final error message.
  throw lastError || new Error(finalErr);
}

/**
 * [SIMULATION] Simulates running a classical docking tool like AutoDock Vina.
 * To make this real, replace the simulated logic with the commented-out blueprint below.
 * @returns A promise that resolves with a docking score.
 */
async function runClassicalDocking(smile: string, protein: string): Promise<number> {
  console.log(`[SIMULATION] Running classical docking for ${smile} and ${protein}...`);
  // Simulate network latency and computation time for a real docking job.
  await new Promise(resolve => setTimeout(resolve, 1500));

  // --- DETERMINISTIC SIMULATION ---
  // This is no longer random. It produces a consistent score based on the inputs.
  // A longer SMILES string or protein name will result in a (theoretically) "better" score.
  const baseScore = -5;
  const smileContribution = (smile.length % 10) * 0.3; 
  const proteinContribution = (protein.length % 10) * 0.2;
  const mockScore = baseScore - smileContribution - proteinContribution;
  
  console.log(`[SIMULATION] Classical docking complete. Score: ${mockScore}`);
  return mockScore;
  
  // --- REAL INTEGRATION BLUEPRINT ---
  /*
    // To implement this for real, you would replace the simulation logic above with a call
    // to a dedicated backend service. This is the standard architecture for running heavy
    // computations from a web application.

    // 1. DEFINE THE BACKEND API REQUEST
    // The Next.js app sends the user's input to a backend API endpoint.
    const apiEndpoint = 'https://your-backend-service.com/run-docking';
    const requestBody = {
      smiles: smile,
      protein_name: protein
    };

    // 2. CALL THE BACKEND SERVICE
    // This `fetch` call is the bridge between your web UI and the powerful tools on the server.
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // The backend should return meaningful error messages.
        const errorData = await response.json();
        throw new Error(errorData.detail || 'The docking service failed.');
      }

      const result = await response.json();
      const score = result.docking_score;
      
      console.log(`Real docking complete. Score: ${score}`);
      return score;

    } catch (error) {
        console.error("Error calling docking service:", error);
        throw error; // Propagate the error to the UI
    }

    // --- WHAT HAPPENS ON THE BACKEND SERVICE? ---
    // The backend service (e.g., a Python Flask/FastAPI server) would perform these steps:
    // a. Receive the request with the SMILES string and protein name.
    // b. Convert the SMILES string to a PDBQT file using MGLTools' prepare_ligand4.py.
    // c. Prepare the target protein's PDB file into a PDBQT file using MGLTools' prepare_receptor4.py.
    // d. Execute the AutoDock Vina command with the prepared files.
    // e. Parse the output log file from Vina to extract the best binding affinity score.
    // f. Return the score in the JSON response to the Next.js app.
  */
  // --- END REAL INTEGRATION BLUEPRINT ---
}


/**
 * [SIMULATION] Simulates a quantum refinement step using a tool like Qiskit.
 * To make this real, replace the simulated logic with the commented-out blueprint.
 * @param classicalScore The score from the classical docking.
 * @returns A promise that resolves with a mock quantum-refined energy.
 */
async function runQuantumRefinementSimulation(classicalScore: number): Promise<number> {
    console.log(`[SIMULATION] Running quantum refinement simulation...`);
    // --- DETERMINISTIC SIMULATION ---
    // Simulate a small, predictable improvement over the classical score.
    const mockQuantumRefinedEnergy = classicalScore - 1.25; 
    
    // --- REAL INTEGRATION BLUEPRINT FOR QISKIT/VQE/QAOA ---
    /*
      // Similar to classical docking, this would be a call to a separate service
      // that has access to quantum computing resources or simulators.

      // 1. Define the input for the quantum service:
      // This would include the molecule's structure from the classical docking result pose.
      const qiskitServiceInput = {
        docked_pose_pdbqt: 'data_from_classical_docking_result_pose.pdbqt',
        // Other parameters for the quantum algorithm...
      };

      // 2. Call the external quantum service:
      const response = await fetch('http://your-quantum-service/calculate-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qiskitServiceInput),
      });

      if (!response.ok) {
        throw new Error('Quantum refinement service failed.');
      }

      // 3. Get the result:
      // The service would return the calculated energy.
      const { refined_energy } = await response.json();
      
      console.log(`Real quantum refinement complete. Energy: ${refined_energy}`);
      return refined_energy;
    */
    // --- END REAL INTEGRATION BLUEPRINT ---

    return mockQuantumRefinedEnergy;
}


export async function runFullDockingProcess(data: DockingInput, userId: string): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const successfulResults: DockingResults[] = [];

  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      try {
        const classicalScore = await runClassicalDocking(smile, protein);
        const quantumRefinedEnergy = await runQuantumRefinementSimulation(classicalScore);
        
        const predictionInput = {
            quantumRefinedEnergy: quantumRefinedEnergy,
            moleculeSmiles: smile,
            proteinTargetName: protein,
        };

        const predictionResult = await retryPromise(() => predictBindingAffinities(predictionInput));

        if (!predictionResult || typeof predictionResult.bindingAffinity !== 'number' || !predictionResult.comparison) {
          throw new Error(`Failed to get a valid binding affinity prediction for ${smile} with ${protein}.`);
        }

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
         // Optionally re-throw or handle the error for the entire process to fail
         throw error;
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
