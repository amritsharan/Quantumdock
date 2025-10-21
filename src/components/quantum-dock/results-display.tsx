'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Info, CheckCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { DockingResults } from '@/lib/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';

interface ResultsDisplayProps {
  results: DockingResults;
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {

  const getAffinityBadge = (affinity: number) => {
    if (affinity < 10) return <Badge variant="default" className='bg-green-500'>High</Badge>;
    if (affinity < 100) return <Badge variant="secondary" className='bg-yellow-500 text-black'>Moderate</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  }

  const handleExport = (format: 'pdf' | 'docx') => {
    if (format === 'pdf') {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text("QuantumDock Simulation Results", 20, 20);

      doc.setFontSize(16);
      doc.text("Prediction Summary", 20, 40);

      doc.setFontSize(12);
      doc.text(`Binding Affinity (nM): ${results.bindingAffinity.toFixed(2)}`, 20, 50);
      doc.text(`Confidence Score: ${(results.confidenceScore * 100).toFixed(0)}%`, 20, 60);

      doc.setFontSize(16);
      doc.text("AI Rationale", 20, 80);
      
      doc.setFontSize(12);
      const rationaleLines = doc.splitTextToSize(results.rationale, 170);
      doc.text(rationaleLines, 20, 90);

      doc.save("QuantumDock_Results.pdf");

    } else if (format === 'docx') {
      alert(`Exporting as ${format.toUpperCase()} is not yet implemented.`);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className='space-y-1.5'>
          <CardTitle>Prediction Results</CardTitle>
          <CardDescription>Binding affinity predicted by the AI model.</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('docx')} disabled>Export as DOCX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Binding Affinity (nM)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{results.bindingAffinity.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {getAffinityBadge(results.bindingAffinity)} affinity
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {(results.confidenceScore * 100).toFixed(0)}%
              </div>
               <p className="text-xs text-muted-foreground mt-1">Model confidence in this prediction</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center space-x-2 space-y-0 pb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">AI Rationale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {results.rationale}
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
