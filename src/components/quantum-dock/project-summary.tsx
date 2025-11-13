
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ShieldCheck } from 'lucide-react';

export function ProjectSummary() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2 flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2 text-green-500" />
          Project Strengths
        </h3>
        <p className="text-sm text-muted-foreground">
          Our hybrid quantum-classical approach provides a distinct advantage over traditional methods. By leveraging quantum-inspired algorithms for energy refinement, we can explore chemical spaces more accurately, potentially uncovering novel binding interactions that classical models might miss. The AI-driven prediction layer further refines these findings, offering a confidence score that helps prioritize the most promising candidates for further research.
        </p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2 flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
          Future Plans
        </h3>
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>
            **Expanded Quantum Algorithms:** Integrate more sophisticated quantum algorithms, such as real-time evolution on quantum hardware, to simulate molecular dynamics more accurately.
          </li>
          <li>
            **Automated Target-Disease Mapping:** Develop an AI model to automatically suggest novel protein targets based on disease pathways, expanding beyond known associations.
          </li>
          <li>
            **Advanced AI Rationale:** Enhance the AI's explanatory capabilities to provide detailed, atom-level insights into the predicted binding interactions, complete with visualizations.
          </li>
        </ul>
      </div>
    </div>
  );
}
