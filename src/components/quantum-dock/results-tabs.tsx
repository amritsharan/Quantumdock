
'use client';

import { useMemo, useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import type { DockingResults } from '@/lib/schema';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { molecules } from '@/lib/molecules';
import { runLiteratureComparison } from '@/app/actions';
import type { ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { ComparativeAnalysisDisplay } from './comparative-analysis-display';
import { Button } from '../ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ResultsTabsProps {
  results: DockingResults[];
  saveState: SaveState;
  onSave: () => void;
}

function LiteratureAnalysisTab({ results }: { results: DockingResults[] }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<ResearchComparisonOutput | null>(null);

    const handleAnalysis = () => {
        startTransition(async () => {
            setError(null);
            setAnalysis(null);
            try {
                const comparison = await runLiteratureComparison(results);
                setAnalysis(comparison);
            } catch (e: any) {
                setError(e.message || 'An unknown error occurred.');
            }
        });
    };

    return (
        <div className="space-y-4">
            {!analysis && !isPending && !error && (
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center min-h-[300px]">
                    <h3 className="text-lg font-semibold">Compare to Scientific Literature</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Run an AI-powered analysis to compare your current docking results against a curated set of recent research papers in computational drug discovery.
                    </p>
                    <Button onClick={handleAnalysis}>
                        Analyze Against Literature
                    </Button>
                </div>
            )}
            {isPending && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">
                           AI is analyzing...
                        </p>
                    </div>
                </div>
            )}
            {error && (
                 <Card className="border-destructive">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                        <h3 className="text-lg font-semibold text-destructive">Analysis Failed</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-4">{error}</p>
                        <Button variant="destructive" onClick={handleAnalysis}>
                            Retry Analysis
                        </Button>
                    </CardContent>
                </Card>
            )}
            {analysis && (
                <ComparativeAnalysisDisplay analysis={analysis} />
            )}
        </div>
    );
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
      'Advanced Model (nM)': res.comparison.standardModelScore,
    }));
  }, [results]);

  const chartConfig = {
    'Quantum Affinity (nM)': {
      label: 'Quantum Affinity (nM)',
      color: 'hsl(var(--accent))',
    },
    'Advanced Model (nM)': {
        label: 'Advanced Model (nM)',
        color: 'hsl(var(--primary))',
    }
  };

  return (
    <Tabs defaultValue="chart">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="chart">Binding Affinity Chart</TabsTrigger>
        <TabsTrigger value="results">Detailed Results</TabsTrigger>
        <TabsTrigger value="literature">Literature Analysis</TabsTrigger>
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
                    <Bar dataKey="Advanced Model (nM)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
      </TabsContent>
      <TabsContent value="results" className="mt-4">
        <ResultsDisplay results={results} onSave={onSave} saveState={saveState} />
      </TabsContent>
      <TabsContent value="literature" className="mt-4">
          <LiteratureAnalysisTab results={results} />
      </TabsContent>
    </Tabs>
  );
}
