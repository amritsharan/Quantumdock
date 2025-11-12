
'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import type { DockingResults } from '@/lib/schema';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { molecules } from '@/lib/molecules';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ResultsTabsProps {
  results: DockingResults[];
  saveState: SaveState;
  onSave: () => void;
}

export function ResultsTabs({ results, saveState, onSave }: ResultsTabsProps) {
  
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
      'Standard Model (nM)': res.comparison.standardModelScore,
    }));
  }, [results]);

  const chartConfig = {
    'Quantum Affinity (nM)': {
      label: 'Quantum Affinity (nM)',
      color: 'hsl(var(--accent))',
    },
    'Standard Model (nM)': {
        label: 'Standard Model (nM)',
        color: 'hsl(var(--primary))',
    }
  };

  return (
    <Tabs defaultValue="chart">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chart">Binding Affinity Chart</TabsTrigger>
        <TabsTrigger value="results">Detailed Results</TabsTrigger>
      </TabsList>
      <TabsContent value="chart" className="mt-4">
        <div className="grid gap-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Binding Affinity Comparison</h3>
                <p className="text-sm text-muted-foreground mb-4">Lower values indicate stronger binding affinity.</p>
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                        width={200}
                    />
                    <XAxis dataKey="Quantum Affinity (nM)" type="number" />
                    <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                     <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="Quantum Affinity (nM)" radius={4} />
                    <Bar dataKey="Standard Model (nM)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
      </TabsContent>
      <TabsContent value="results" className="mt-4">
        <ResultsDisplay results={results} onSave={onSave} saveState={saveState} />
      </TabsContent>
    </Tabs>
  );
}
