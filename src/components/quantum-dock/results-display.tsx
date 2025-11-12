
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown, ChevronsUpDown, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { DockingResults } from '@/lib/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { molecules } from '@/lib/molecules';

import { Document, Packer, Paragraph, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ResultsDisplayProps {
  results: DockingResults[];
  onSave: () => void;
  saveState: SaveState;
}

type SortKey = 'name' | 'proteinTarget' | 'bindingAffinity' | 'confidenceScore' | 'standardModelScore';
type SortDirection = 'asc' | 'desc';

const SaveButtonContent: Record<SaveState, { icon: React.ReactNode, text: string }> = {
    idle: { icon: <Save className="mr-2 h-4 w-4" />, text: 'Save Docking Results' },
    saving: { icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />, text: 'Saving...' },
    saved: { icon: <CheckCircle className="mr-2 h-4 w-4" />, text: 'Results Saved' },
    error: { icon: <AlertCircle className="mr-2 h-4 w-4" />, text: 'Save Failed' },
};


export function ResultsDisplay({ results, onSave, saveState }: ResultsDisplayProps) {
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
    return sortDirection === 'asc' ? <span className="ml-2">▲</span> : <span className="ml-2">▼</span>;
  };


  const handleExport = async (format: 'pdf' | 'docx') => {
    const docTitle = "QuantumDock Simulation Results";
    
    if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(docTitle, 20, 20);
      
      const tableColumn = ["Molecule", "Protein", "Quantum Affinity (nM)", "Standard ML (nM)", "Confidence", "Explanation"];
      const tableRows: any[][] = [];

      sortedResults.forEach(res => {
          const row = [
              res.name,
              res.proteinTarget,
              res.bindingAffinity.toFixed(2),
              res.standardModelScore.toFixed(2),
              `${(res.confidenceScore * 100).toFixed(0)}%`,
              res.explanation,
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
                new DocxTableCell({ children: [new Paragraph({ text: "Molecule", style: "strong" })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Protein", style: "strong" })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Quantum Affinity (nM)", style: "strong" })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Standard ML (nM)", style: "strong" })] }),
                new DocxTableCell({ children: [new Paragraph({ text: "Confidence", style: "strong" })] }),
            ],
        });

        const tableRows = sortedResults.flatMap(res => [
          new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(res.name)] }),
                new DocxTableCell({ children: [new Paragraph(res.proteinTarget)] }),
                new DocxTableCell({ children: [new Paragraph(res.bindingAffinity.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(res.standardModelScore.toFixed(2))] }),
                new DocxTableCell({ children: [new Paragraph(`${(res.confidenceScore * 100).toFixed(0)}%`)] }),
            ],
          }),
          new DocxTableRow({
            children: [
              new DocxTableCell({
                columnSpan: 5,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Explanation: ", bold: true }), new TextRun(res.explanation)]
                  })
                ]
              })
            ]
          })
        ]);

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

  const { icon, text } = SaveButtonContent[saveState];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className='space-y-1.5'>
          <CardTitle>Detailed Prediction Results</CardTitle>
          <CardDescription>Tabular data for {results.length} combination(s) with AI analysis.</CardDescription>
        </div>
        <div className='flex items-center gap-2'>
            <Button 
                onClick={onSave} 
                disabled={saveState === 'saving' || saveState === 'saved'}
                variant={saveState === 'error' ? 'destructive' : 'default'}
                size="sm"
            >
                {icon}
                {text}
            </Button>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex p-4 border-b font-medium text-muted-foreground text-sm">
          <div className="w-2/12 cursor-pointer flex items-center" onClick={() => handleSort('name')}>Molecule {getSortIcon('name')}</div>
          <div className="w-2/12 cursor-pointer flex items-center" onClick={() => handleSort('proteinTarget')}>Protein {getSortIcon('proteinTarget')}</div>
          <div className="w-2/12 cursor-pointer flex items-center" onClick={() => handleSort('bindingAffinity')}>Quantum Affinity (nM) {getSortIcon('bindingAffinity')}</div>
          <div className="w-2/12 cursor-pointer flex items-center" onClick={() => handleSort('standardModelScore')}>Standard ML (nM) {getSortIcon('standardModelScore')}</div>
          <div className="w-2/12 cursor-pointer flex items-center" onClick={() => handleSort('confidenceScore')}>Confidence {getSortIcon('confidenceScore')}</div>
          <div className="w-2/12 text-left">Affinity Level</div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {sortedResults.map((result, index) => (
            <AccordionItem value={`item-${index}`} key={`${result.moleculeSmiles}-${result.proteinTarget}-${index}`}>
              <AccordionTrigger className="flex items-center p-4 hover:bg-muted/50 hover:no-underline text-sm">
                <div className="w-2/12 font-medium text-left">{result.name}</div>
                <div className="w-2/12 font-medium text-left">{result.proteinTarget}</div>
                <div className="w-2/12 text-left">{result.bindingAffinity.toFixed(2)}</div>
                <div className="w-2/12 text-left">{result.standardModelScore.toFixed(2)}</div>
                <div className="w-2/12 text-left">{`${(result.confidenceScore * 100).toFixed(0)}%`}</div>
                <div className="w-2/12 text-left">{getAffinityBadge(result.bindingAffinity)}</div>
              </AccordionTrigger>
              <AccordionContent>
                 <div className="p-4 bg-muted/50 space-y-4">
                  <div className='pt-4 border-t'>
                    <p className="font-semibold text-sm">Explanation</p>
                    <p className="text-xs text-muted-foreground">{result.explanation}</p>
                  </div>
                  <div className='pt-4 border-t'>
                    <p className="font-semibold text-sm">Interaction Rationale</p>
                    <p className="text-xs text-muted-foreground">{result.rationale}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
