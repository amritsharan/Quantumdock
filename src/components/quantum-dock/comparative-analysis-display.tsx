
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ResearchComparisonOutput } from '@/ai/flows/compare-to-literature';
import { CheckCircle, AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';

interface ComparativeAnalysisDisplayProps {
  analysis: ResearchComparisonOutput;
}

export function ComparativeAnalysisDisplay({ analysis }: ComparativeAnalysisDisplayProps) {
  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparative Literature Analysis</CardTitle>
        <CardDescription>
          An AI-powered comparison of your simulation results against recent scientific literature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Overall Assessment</h3>
          <p className="text-sm text-muted-foreground">{analysis.overallAssessment}</p>
        </div>

        <div className="grid md:grid-cols-1 gap-4">
            <div className="space-y-2">
                <h4 className="font-semibold flex items-center"><CheckCircle className="h-5 w-5 mr-2 text-green-500" />Project Strengths</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    {analysis.projectStrengths.map((strength, i) => <li key={i}>{strength}</li>)}
                </ul>
            </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
            Recommended Future Directions
            </h3>
          <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            {analysis.futureDirections.map((direction, i) => <li key={i}>{direction}</li>)}
          </ul>
        </div>

        <div>
            <h3 className="font-semibold text-lg mb-2">Detailed Paper-by-Paper Analysis</h3>
            <Accordion type="single" collapsible className="w-full">
                {analysis.paperComparisons.map((comp, index) => (
                    <AccordionItem value={`item-${index}`} key={comp.paperName}>
                        <AccordionTrigger>{comp.paperName}</AccordionTrigger>
                        <AccordionContent className="space-y-4 text-xs">
                             <div>
                                <p className="font-semibold mb-1">Alignment:</p>
                                <p className="text-muted-foreground">{comp.alignment}</p>
                            </div>
                             <div>
                                <p className="font-semibold mb-1">Differentiation:</p>
                                <p className="text-muted-foreground">{comp.differentiation}</p>
                            </div>
                             <div>
                                <p className="font-semibold mb-1">Addressing Drawbacks:</p>
                                <p className="text-muted-foreground">{comp.addressingDrawbacks}</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
