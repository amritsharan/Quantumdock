
'use client';

import { BrainCircuit } from 'lucide-react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import type { Molecule } from '@/lib/molecules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '../ui/badge';
import { useMemo } from 'react';
import type { DockingResults } from '@/lib/schema';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { molecules } from '@/lib/molecules';


interface MoleculeViewerProps {
  isDocked: boolean;
  molecules: Molecule[];
  results: DockingResults[] | null;
  bestResultMolecule: Molecule | null;
}

const MoleculeProperties = ({ molecule }: { molecule: Molecule }) => (
    <div className='text-xs space-y-2 p-2'>
        <div className='flex justify-between'>
            <span className='font-semibold'>Chemical Formula:</span>
            <span className='font-mono'>{molecule.formula}</span>
        </div>
        <div className='flex justify-between'>
            <span className='font-semibold'>Molecular Weight:</span>
            <span className='font-mono'>{molecule.molecularWeight.toFixed(2)} Da</span>
        </div>
    </div>
);

export function MoleculeViewer({ isDocked, molecules, bestResultMolecule, results }: MoleculeViewerProps) {

  const hasSelection = molecules && molecules.length > 0;

  const combinedProperties = useMemo(() => {
    if (!molecules || molecules.length === 0) {
      return { totalWeight: 0, totalDonors: 0, totalAcceptors: 0 };
    }
    return molecules.reduce(
      (acc, mol) => {
        acc.totalWeight += mol.molecularWeight;
        acc.totalDonors += mol.donors;
        acc.totalAcceptors += mol.acceptors;
        return acc;
      },
      { totalWeight: 0, totalDonors: 0, totalAcceptors: 0 }
    );
  }, [molecules]);

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
  
  if (!hasSelection && !bestResultMolecule) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription>Select molecules to see their structure. Best result shown after simulation.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="min-h-[250px] relative rounded-md border flex items-center justify-center">
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
                        <BrainCircuit className="h-24 w-24 text-muted-foreground" />
                        <p className="text-center text-muted-foreground">
                        Select molecule(s) to see their structure. After simulation, the best result will appear here.
                        </p>
                    </div>
                </div>
            </CardContent>
      </Card>
    );
  }

  if (isDocked && bestResultMolecule && results) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Visualization & Properties</CardTitle>
                <CardDescription>Best molecule: {bestResultMolecule.name}. Properties shown for all {molecules.length} selected molecule(s).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="min-h-[250px] relative rounded-md border flex items-center justify-center p-4">
                    <Image
                        src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(bestResultMolecule.smiles)}/image?width=250&height=250`}
                        alt={`Structure of ${bestResultMolecule.name}`}
                        width={250}
                        height={250}
                        className="rounded-md bg-white p-2"
                        unoptimized
                    />
                </div>
                <Tabs defaultValue="weight" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="weight">Mol. Weight</TabsTrigger>
                        <TabsTrigger value="donors">H-Donors</TabsTrigger>
                        <TabsTrigger value="acceptors">H-Acceptors</TabsTrigger>
                    </TabsList>
                    <TabsContent value="weight">
                        <Card>
                        <CardHeader className="p-4 flex-row items-center justify-between">
                            <CardTitle>Combined Weight</CardTitle>
                             <p className='text-lg font-mono'>{combinedProperties.totalWeight.toFixed(2)} Da</p>
                        </CardHeader>
                        </Card>
                    </TabsContent>
                    <TabsContent value="donors">
                        <Card>
                        <CardHeader className="p-4 flex-row items-center justify-between">
                            <CardTitle>Total H-Donors</CardTitle>
                            <p className='text-lg font-mono'>{combinedProperties.totalDonors}</p>
                        </CardHeader>
                        </Card>
                    </TabsContent>
                    <TabsContent value="acceptors">
                        <Card>
                        <CardHeader className="p-4 flex-row items-center justify-between">
                             <CardTitle>Total H-Acceptors</CardTitle>
                             <p className='text-lg font-mono'>{combinedProperties.totalAcceptors}</p>
                        </CardHeader>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="mt-6">
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


            </CardContent>
       </Card>
      );
  }
  
  if (!isDocked && hasSelection) {
    return (
    <Card>
        <CardHeader>
            <CardTitle>Visualization</CardTitle>
            <CardDescription>Visualize the selected molecules.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="min-h-[250px] relative rounded-md border flex items-center justify-center">
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
                    <Carousel className="w-full max-w-xs">
                        <CarouselContent>
                        {molecules.map((mol, index) => (
                            <CarouselItem key={index}>
                            <div className="p-1">
                                <div className="flex flex-col aspect-square items-center justify-center p-2 gap-2">
                                    <Image
                                    src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(mol.smiles)}/image?width=200&height=200`}
                                    alt={`Structure of ${mol.name}`}
                                    width={200}
                                    height={200}
                                    className="rounded-md bg-white p-2"
                                    unoptimized
                                    />
                                    <p className='font-semibold text-sm'>{mol.name}</p>
                                    <div className="text-xs text-muted-foreground space-y-1 text-center">
                                        <p className='font-mono'>Chemical Formula: {mol.formula}</p>
                                        <p className='font-mono'>Molecular Weight: {mol.molecularWeight.toFixed(2)} Da</p>
                                    </div>
                                </div>
                            </div>
                            </CarouselItem>
                        ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                </div>
            </div>
        </CardContent>
    </Card>
    );
  }

  return null;
}
