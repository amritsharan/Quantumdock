
'use client';

import { useState, useTransition } from 'react';
import { Button } from '../ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { runLiteratureComparison } from '@/app/actions';
import type { DockingResults } from '@/lib/schema';
import type { ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { ComparativeAnalysisDisplay } from './comparative-analysis-display';

export function LiteratureAnalysis({ results }: { results: DockingResults[] }) {
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

    if (!analysis && !isPending && !error) {
        return (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center min-h-[300px]">
                <h3 className="text-lg font-semibold">Compare to Scientific Literature</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                    Run an AI-powered analysis to compare your current docking results against a curated set of recent research papers in computational drug discovery.
                </p>
                <Button onClick={handleAnalysis}>
                    Analyze Against Literature
                </Button>
            </div>
        );
    }
    
    if (isPending) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                        AI is analyzing...
                    </p>
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
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
        );
    }
    
    if (analysis) {
        return (
            <ComparativeAnalysisDisplay analysis={analysis} />
        );
    }

    return null;
}
