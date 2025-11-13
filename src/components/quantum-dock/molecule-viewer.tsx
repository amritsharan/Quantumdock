
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


interface MoleculeViewerProps {
  isDocked: boolean;
  molecules: Molecule[];
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

export function MoleculeViewer({ isDocked, molecules, bestResultMolecule }: MoleculeViewerProps) {

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

  if (isDocked && bestResultMolecule) {
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
