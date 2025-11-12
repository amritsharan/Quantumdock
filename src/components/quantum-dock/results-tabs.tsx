
'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import { ComparativeAnalysisDisplay } from '@/components/quantum-dock/comparative-analysis-display';
import type { DockingResults } from '@/lib/schema';
import type { ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { molecules } from '@/lib/molecules';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ResultsTabsProps {
  results: DockingResults[];
  analysis: ResearchComparisonOutput;
  saveState: SaveState;
  onSave: () => void;
}

export function ResultsTabs({ results, analysis, saveState, onSave }: ResultsTabsProps) {
  
  const chartData = useMemo(() => {
    if (!results) return [];
    const resultsWithNames = results.map(result => {
        const molecule = molecules.find(m => m.smiles === result.moleculeSmiles);
        return {
            ...result,
            name: molecule ? molecule.name : 'Unknown Molecule',
        };
    });
    return resultsWithNames.sort((a, b) => a.bindingAffinity - b.bindingAffinity).map(res => ({
      name: `${res.name} + ${res.proteinTarget}`,
      'Quantum Affinity (nM)': res.bindingAffinity,
    }));
  }, [results]);

  const chartConfig = {
    'Quantum Affinity (nM)': {
      label: 'Quantum Affinity (nM)',
      color: 'hsl(var(--accent))',
    },
  };

  return (
    <Tabs defaultValue="chart">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="chart">Binding Affinity Chart</TabsTrigger>
        <TabsTrigger value="results">Detailed Results</TabsTrigger>
        <TabsTrigger value="analysis">Literature Analysis</TabsTrigger>
      </TabsList>
      <TabsContent value="chart" className="mt-4">
        <div className="grid gap-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Binding Affinity Chart</h3>
                <p className="text-sm text-muted-foreground mb-4">Lower values indicate stronger binding affinity.</p>
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                    <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    />
                    <XAxis dataKey="Quantum Affinity (nM)" type="number" />
                    <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="Quantum Affinity (nM)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
      </TabsContent>
      <TabsContent value="results" className="mt-4">
        <ResultsDisplay results={results} onSave={onSave} saveState={saveState} />
      </TabsContent>
      <TabsContent value="analysis" className="mt-4">
        <ComparativeAnalysisDisplay analysis={analysis} />
      </TabsContent>
    </Tabs>
  );
}
