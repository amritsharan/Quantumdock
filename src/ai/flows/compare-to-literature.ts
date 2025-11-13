
'use server';

/**
 * @fileOverview Performs a comparative analysis of the app's results against a hardcoded literature survey.
 *
 * - analyzeResearchComparison - A function that performs the analysis.
 * - ResearchComparisonInput - The input type for the analysis function.
 * - ResearchComparisonOutput - The return type for the analysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResearchComparisonInputSchema = z.array(z.object({
    moleculeSmiles: z.string(),
    proteinTarget: z.string(),
    bindingAffinity: z.number(),
    confidenceScore: z.number(),
    rationale: z.string(),
    standardModelScore: z.number(),
    aiCommentary: z.string(),
}));

export type ResearchComparisonInput = z.infer<typeof ResearchComparisonInputSchema>;

const PaperComparisonSchema = z.object({
    paperName: z.string().describe('The name of the research paper.'),
    alignment: z.string().describe("Analysis of how this project aligns with the paper's methods or goals."),
    differentiation: z.string().describe("Analysis of how this project differs from or improves upon the paper's approach."),
    addressingDrawbacks: z.string().describe("Analysis of how this project addresses the specific drawbacks mentioned for this paper."),
});

const ResearchComparisonOutputSchema = z.object({
  overallAssessment: z.string().describe("A high-level summary of how the QuantumDock project fits into the current research landscape defined by the literature survey."),
  projectStrengths: z.array(z.string()).describe("A list of key strengths of the QuantumDock project when compared to the cited research."),
  projectWeaknesses: z.array(z.string()).describe("A list of weaknesses or limitations of the QuantumDock project, considering the drawbacks mentioned in the literature."),
  futureDirections: z.array(z.string()).describe("A list of actionable suggestions for future work on the QuantumDock project to address its weaknesses and align better with advanced research."),
  paperComparisons: z.array(PaperComparisonSchema).describe("A detailed, per-paper comparison."),
});

export type ResearchComparisonOutput = z.infer<typeof ResearchComparisonOutputSchema>;


export async function analyzeResearchComparison(
  input: ResearchComparisonInput
): Promise<ResearchComparisonOutput> {
  return compareToLiteratureFlow(input);
}

const literatureSurvey = `
LITERATURE SURVEY
PAPER NAME: Hybrid quantum cycle generative adversarial network for small molecule generation (2023 / late 2023)
AUTHOR(S): Matvei Anoshin, Asel Sagingalieva, Christopher Mansell, Dmitry Zhiganov, Vishal Shete, Markus Pflitsch, Alexey Melnikov
DESCRIPTION: Proposes hybrid quantum generative models (quantum circuits + classical GAN architecture) to generate small drug-like molecules; shows improvement in drug-likeness metrics and pharmacokinetic properties on benchmark datasets.
DRAWBACKS: Purely generative; generated molecules may not be synthesizable or biologically active; results depend heavily on quality of benchmarks but do not include wet lab validation.

PAPER NAME: A Hybrid Quantum Computing Pipeline for Real World Drug Discovery (2024)
AUTHOR(S): Weitang Li, Zhi Yin, Xiaoran Li, Dongqiang Ma, Shuang Yi, Zhenxing Zhang, Chenji Zou, Kunliang Bu, Maochun Dai, Jie Yue, Yuzong Chen, Xiaojin Zhang, Shengvu Zhang
DESCRIPTION: Develops a hybrid pipeline targeting realistic drug design tasks: Gibbs free energy profiles for prodrug activation, simulation of covalent bond interactions; tries to move beyond toy models.
DRAWBACKS: Even this “real-world” pipeline still has limitations: scale of molecules/proteins studied is modest; challenges with noise, hardware availability; may still rely on simulated or approximated quantum parts.

PAPER NAME: Quantum Long Short-Term Memory for Drug Discovery (2024)
AUTHOR(S): Liang Zhang, Yin Xu, Mohan Wu, Liang Wang, Hua Xu
DESCRIPTION: Presents a quantum variant of Long Short-Term Memory (LSTM) model for drug discovery tasks; shows better convergence and robustness to noise; increasing qubit count improves performance.
DRAWBACKS: Likely simulated (not large scale hardware); may not yet handle full chemical diversity; the improvement may be marginal in real drug pipelines; computational overhead / noise sensitivity may grow with size.

PAPER NAME: Quantum-machine-assisted Drug Discovery: Survey and Perspective (2024)
AUTHOR(S): Yidong Zhou, Jintai Chen, Jinglei Cheng, Gopal Karemore, Marinka Zitnik, Frederic T. Chong, Junyu Liu, Tianfan Fu, Zhiding Liang
DESCRIPTION: A comprehensive survey discussing how quantum computing can assist many stages: molecular simulation, prediction, optimization; discusses current challenges and future prospects.
DRAWBACKS: Being a survey, it doesn't contribute new experimental data; general discussion detailed case studies or proof on real drug leads; many claims are prospective rather than demonstrated.
`;

const prompt = ai.definePrompt({
  name: 'compareToLiteraturePrompt',
  input: {schema: z.object({ resultsJson: z.string() })},
  output: {schema: ResearchComparisonOutputSchema},
  prompt: `You are an expert research scientist in the field of computational drug discovery.

Your task is to analyze the methodology and results of a software project called "QuantumDock" and compare it to a provided literature survey.

**QuantumDock Project Description:**
QuantumDock is a web application that simulates molecular docking. Its workflow is as follows:
1.  It first performs a *simulated* classical docking to get a base score.
2.  It then performs a *simulated* quantum refinement step (representing a VQE/QAOA algorithm) to get a "quantum-refined energy".
3.  Finally, it uses a large language model (like Gemini) to interpret this quantum-refined energy and predict a final binding affinity. The key innovation is this "Classical -> Quantum -> AI Interpretation" pipeline. The project also provides a comparative score from a simulated "Advanced ML Model" to highlight the potential difference a quantum-informed approach could make. The entire process is a simulation designed to demonstrate the potential of such a workflow.

**Your Input:**
1.  **Literature Survey:** A list of recent papers, their descriptions, and their noted drawbacks.
2.  **QuantumDock Simulation Results:** A JSON object containing the results from a recent simulation run within the app. The key innovation to analyze is the comparison between our quantum-informed model and the "Advanced ML Model" score.

**Literature Survey:**
${literatureSurvey}

**QuantumDock Simulation Results:**
Here are the results from the latest simulation run:
\`\`\`json
{{{resultsJson}}}
\`\`\`

**Your Task:**
Based on all the information above, generate a comprehensive comparative analysis. Your tone should be professional, insightful, and constructively critical.

1.  **Overall Assessment:** Write a high-level summary of how the QuantumDock project fits into the research landscape defined by the provided papers.
2.  **Strengths:** Identify and list the key strengths of the QuantumDock project. How does its approach align with the positive trends in the research (e.g., hybrid methods)? How does it uniquely contribute (e.g., the AI interpretation layer, the explicit comparison between our quantum-informed model and the advanced ML model)?
3.  **Weaknesses:** Identify and list the weaknesses and limitations of the QuantumDock project. Be critical and connect these weaknesses directly to the "Drawbacks" mentioned in the literature survey (e.g., reliance on simulation, scalability, real-world validation).
4.  **Future Directions:** Based on the weaknesses, provide a list of concrete, actionable suggestions for future work on QuantumDock. What should be the next steps to move it from a simulation to a more robust, validated tool?
5.  **Per-Paper Comparison:** For each of the four papers in the survey, provide a detailed analysis covering:
    -   **Alignment:** How does QuantumDock's approach align with the paper's goals or methods?
    -   **Differentiation:** How is QuantumDock's approach different? Does it add a new component (like the final AI step and the explicit comparison between our quantum-informed model and the advanced ML model)?
    -   **Addressing Drawbacks:** Does QuantumDock attempt to address any of the drawbacks listed for that paper? Or does it suffer from the same ones?

Produce the output in the required JSON format.
`,
});

const compareToLiteratureFlow = ai.defineFlow(
  {
    name: 'compareToLiteratureFlow',
    inputSchema: ResearchComparisonInputSchema,
    outputSchema: ResearchComparisonOutputSchema,
  },
  async input => {
    // This is the data that is passed to the prompt. It must match what the prompt expects.
    // The prompt expects a single object with a `resultsJson` key which is a string.
    // The `input` to this flow is an array of objects. We just need to stringify it.
    const resultsJson = JSON.stringify(input, null, 2);
    const {output} = await prompt({ resultsJson });
    return output!;
  }
);
