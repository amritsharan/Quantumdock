
'use server';

import { predictBindingAffinities } from '@/ai/flows/predict-binding-affinities';
import { suggestTargetProteins } from '@/ai/flows/suggest-target-proteins';
import { dockingSchema, type DockingInput, type DockingResults } from '@/lib/schema';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';


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
  
  // --- REAL INTEGRATION BLUEPRINT FOR AUTODOCK VINA ---
  /*
    // To implement this for real, you would replace the simulation logic above with a call
    // to a backend service or a direct command-line execution. This requires Node.js's
    // 'child_process' module to run external commands.

    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    // --- STEP 1: PREPARE INPUT FILES WITH MGLTOOLS ---
    // This is where you would use the scripts from MGLTools (AutoDockTools) that you downloaded.
    // You'd need to convert the SMILES string to a 3D format (like PDB) first, and then to PDBQT.
    // The protein PDB file would also need to be converted to PDBQT.

    // A helper function would convert SMILES to PDB, e.g., using an online service or another tool.
    const ligandPdbContent = await getPdbFromSmiles(smile);
    fs.writeFileSync('ligand.pdb', ligandPdbContent);

    // Assume the target protein PDB file is available at a known path.
    const receptorPdbPath = `path/to/proteins/${protein}.pdb`;
    
    // Define paths to your MGLTools scripts.
    const mglToolsPath = '/path/to/mgltools_x86_64Linux2_1.5.7/MGLToolsPckgs';
    const prepareLigandScript = path.join(mglToolsPath, 'AutoDockTools/Utilities24/prepare_ligand4.py');
    const prepareReceptorScript = path.join(mglToolsPath, 'AutoDockTools/Utilities24/prepare_receptor4.py');
    
    // Command to prepare the ligand (molecule).
    const ligandCmd = `pythonsh ${prepareLigandScript} -l ligand.pdb -o ligand.pdbqt`;
    
    // Command to prepare the receptor (protein).
    const receptorCmd = `pythonsh ${prepareReceptorScript} -r ${receptorPdbPath} -o receptor.pdbqt`;

    // Execute preparation scripts.
    await new Promise((resolve, reject) => {
        exec(`${ligandCmd} && ${receptorCmd}`, (err, stdout, stderr) => {
            if (err) {
                console.error("MGLTools preparation error:", stderr);
                return reject(new Error("File preparation failed."));
            }
            console.log("PDBQT files prepared successfully.");
            resolve(stdout);
        });
    });


    // --- STEP 2: DEFINE THE AUTODOCK VINA COMMAND ---
    // This command executes Vina. You'd need to know the path to the 'vina' executable
    // and define the search space (center_x, center_y, etc.).
    const vinaCmd = `vina --receptor receptor.pdbqt --ligand ligand.pdbqt --out result_pose.pdbqt --log result.log --cpu 1 --center_x 10 --center_y 10 --center_z 10 --size_x 20 --size_y 20 --size_z 20`;

    // --- STEP 3: EXECUTE VINA AND PARSE THE OUTPUT ---
    return new Promise((resolve, reject) => {
      exec(vinaCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`AutoDock Vina execution error: ${stderr}`);
          reject(new Error('AutoDock Vina failed.'));
          return;
        }

        // After execution, you must parse the output log file to find the score.
        const logContent = fs.readFileSync('result.log', 'utf-8');
        const match = logContent.match(/Affinity:\s*(-?\d+\.\d+)/);
        if (match && match[1]) {
          const score = parseFloat(match[1]);
          console.log(`Real docking complete. Score: ${score}`);
          resolve(score);
        } else {
          reject(new Error('Could not parse docking score from Vina log file.'));
        }
      });
    });
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
    
    // --- REAL INTEGRATION BLUEPRINT FOR QISKIT ---
    /*
      // To implement this for real, you would replace the simulation logic above with a call
      // to a separate service (e.g., a Python Flask API or a serverless function) that can
      // run a Python environment with Qiskit installed.

      // 1. Define the input for the quantum service:
      // This would include the molecule's structure from the classical docking result.
      const qiskitServiceInput = {
        dockedPose: 'data_from_result_pose.pdbqt',
        // Other parameters for the quantum algorithm...
      };

      // 2. Call the external Qiskit service:
      // This would be a network request (e.g., using fetch) to your quantum backend.
      const response = await fetch('http://your-qiskit-service-url/calculate-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qiskitServiceInput),
      });

      if (!response.ok) {
        throw new Error('Quantum refinement service failed.');
      }

      // 3. Get the result:
      // The service would return the calculated energy.
      const { refinedEnergy } = await response.json();
      
      console.log(`Real quantum refinement complete. Energy: ${refinedEnergy}`);
      return refinedEnergy;
    */
    // --- END REAL INTEGRATION BLUEPRINT ---

    return mockQuantumRefinedEnergy;
}


export async function runFullDockingProcess(data: DockingInput, userId: string): Promise<DockingResults[]> {
  const validatedData = dockingSchema.parse(data);
  const predictionPromises: Promise<DockingResults>[] = [];

  for (const smile of validatedData.smiles) {
    for (const protein of validatedData.proteinTargets) {
      const promise = runClassicalDocking(smile, protein)
        .then(classicalScore => {
            // This function call is the integration point for a real quantum algorithm.
            return runQuantumRefinementSimulation(classicalScore);
        })
        .then(quantumRefinedEnergy => {
            const predictionInput = {
                quantumRefinedEnergy: quantumRefinedEnergy,
                moleculeSmiles: smile,
                proteinTargetName: protein,
            };
            // The AI acts as an expert, interpreting the final energy value.
            return retryPromise(() => predictBindingAffinities(predictionInput));
        })
        .then(async (predictionResult) => {
          if (!predictionResult || typeof predictionResult.bindingAffinity !== 'number') {
            throw new Error(`Failed to get a valid binding affinity prediction for ${smile} with ${protein}.`);
          }
          const finalResult: DockingResults = {
            ...predictionResult,
            moleculeSmiles: smile,
            proteinTarget: protein,
          };
          
          return finalResult;
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

export async function saveDockingResults(userId: string, results: DockingResults[]) {
    if (!userId || !results || results.length === 0) {
      throw new Error("User ID and results are required to save.");
    }
    
    // This is a placeholder. In a real app, you would get the firestore instance
    // from your Firebase setup.
    const { getFirestore } = await import('firebase/firestore');
    const firestore = getFirestore();

    try {
        const historyQuery = query(
            collection(firestore, "users", userId, "loginHistory"),
            orderBy("loginTime", "desc"),
            limit(1)
        );
        const historySnapshot = await getDocs(historyQuery);
        if (historySnapshot.empty) {
            throw new Error("No active login session found for the user.");
        }
        const latestSessionDoc = historySnapshot.docs[0];
        const simulationsCollectionRef = collection(firestore, 'users', userId, 'loginHistory', latestSessionDoc.id, 'dockingSimulations');
        
        const batch = [];
        for (const result of results) {
            const simulationData = {
                userId: userId,
                loginHistoryId: latestSessionDoc.id,
                timestamp: serverTimestamp(),
                moleculeSmiles: result.moleculeSmiles,
                proteinTarget: result.proteinTarget,
                bindingAffinity: result.bindingAffinity,
            };
            batch.push(addDoc(simulationsCollectionRef, simulationData));
        }

        await Promise.all(batch);
    } catch (error) {
        console.error("Failed to save docking results: ", error);
        throw new Error("Could not save docking results due to a database error.");
    }
}
