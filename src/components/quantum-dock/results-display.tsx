
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { DockingResults } from '@/lib/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { molecules } from '@/lib/molecules';

import { Document, Packer, Paragraph, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { useMemo, useState } from 'react';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


interface ResultsDisplayProps {
  results: DockingResults[];
}

type SortKey = 'name' | 'proteinTarget' | 'bindingAffinity' | 'confidenceScore';
type SortDirection = 'asc' | 'desc';

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const [sortKey, setSortKey] = useState<SortKey>('bindingAffinity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getAffinityBadge = (affinity: number) => {
    if (affinity < 10) return <Badge variant="default" className='bg-green-500 hover:bg-green-600'>High</Badge>;
    if (affinity < 100) return <Badge variant="secondary" className='bg-yellow-500 text-black hover:bg-yellow-600'>Moderate</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  }

  const resultsWithNames = useMemo(() => {
    return results.map(result => {
        const molecule = molecules.find(m => m.smiles === result.moleculeSmiles);
        return {
            ...result,
            name: molecule ? molecule.name : 'Unknown Molecule',
        };
    });
  }, [results]);

  const sortedResults = useMemo(() => {
    return [...resultsWithNames].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [resultsWithNames, sortKey, sortDirection]);

  const chartData = useMemo(() => {
    return sortedResults.map(res => ({
      name: `${res.name} + ${res.proteinTarget}`,
      'Binding Affinity (nM)': res.bindingAffinity,
    }));
  }, [sortedResults]);

  const chartConfig = {
    'Binding Affinity (nM)': {
      label: 'Binding Affinity (nM)',
      color: 'hsl(var(--accent))',
    },
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? '▲' : '▼';
  };


  const handleExport = async (format: 'pdf' | 'docx') => {
    const docTitle = "QuantumDock Simulation Results";
    
    if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(docTitle, 20, 20);
      
      const tableColumn = ["Molecule", "Protein Target", "Binding Affinity (nM)", "Confidence", "Rationale"];
      const tableRows: any[][] = [];

      sortedResults.forEach(res => {
          const row = [
              res.name,
              res.proteinTarget,
              res.bindingAffinity.toFixed(2),
              `${(res.confidenceScore * 100).toFixed(0)}%`,
              res.rationale
          ];
          tableRows.push(row);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [46, 82, 102] }
      });

      doc.save("QuantumDock_Results.pdf");

    } else if (format === 'docx') {
        const tableHeader = new DocxTableRow({
            children: [
                new DocxTableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "Molecule", style: "strong" })] }),
                new DocxTableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "Protein Target", style: "strong" })] }),
                new DocxTableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "Binding Affinity (nM)", style: "strong" })] }),
                new DocxTableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "Confidence", style: "strong" })] }),
                new DocxTableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: "Rationale", style: "strong" })] }),
            ],
        });

        const tableRows = sortedResults.map(res => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(res.name)] }),
                new DocxTableCell({ children: [new Paragraph(res.proteinTarget)] }),
                new DocxTableCell({ children: [new Paragraph(res.bindingAffinity.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(`${(res.confidenceScore * 100).toFixed(0)}%`)] }),
                new DocxTableCell({ children: [new Paragraph(res.rationale)] }),
            ],
        }));

       const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: "strong", name: "Strong", run: { bold: true } }
            ]
        },
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: docTitle, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "", spacing: { after: 200 } }),
            new DocxTable({
                rows: [tableHeader, ...tableRows],
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        }],
      });

      Packer.toBlob(doc).then(blob => {
        saveAs(blob, "QuantumDock_Results.docx");
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className='space-y-1.5'>
          <CardTitle>Prediction Results</CardTitle>
          <CardDescription>Binding affinity predictions for {results.length} combination(s).</CardDescription>
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
            <DropdownMenuItem onClick={() => handleExport('docx')}>Export as DOCX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="grid gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Binding Affinity Chart</h3>
          <p className="text-sm text-muted-foreground mb-4">Lower values indicate stronger binding affinity.</p>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
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
              <XAxis dataKey="Binding Affinity (nM)" type="number" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="Binding Affinity (nM)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>

        <div>
           <h3 className="text-lg font-semibold mb-4">Detailed Results Table</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center">Molecule {getSortIcon('name')}</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('proteinTarget')} className="cursor-pointer">
                    <div className="flex items-center">Protein Target {getSortIcon('proteinTarget')}</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('bindingAffinity')} className="cursor-pointer">
                    <div className="flex items-center">Affinity (nM) {getSortIcon('bindingAffinity')}</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('confidenceScore')} className="cursor-pointer">
                    <div className="flex items-center">Confidence {getSortIcon('confidenceScore')}</div>
                  </TableHead>
                  <TableHead>Affinity Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result, index) => (
                  <TableRow key={`${result.moleculeSmiles}-${result.proteinTarget}-${index}`}>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell className="font-medium">{result.proteinTarget}</TableCell>
                    <TableCell>{result.bindingAffinity.toFixed(2)}</TableCell>
                    <TableCell>{(result.confidenceScore * 100).toFixed(0)}%</TableCell>
                    <TableCell>{getAffinityBadge(result.bindingAffinity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
