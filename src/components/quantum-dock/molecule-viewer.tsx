
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


interface MoleculeViewerProps {
  isDocked: boolean;
  molecules: Molecule[];
  bestResultMolecule: Molecule | null;
}

const MoleculeProperties = ({ molecule }: { molecule: Molecule }) => (
    <div className='text-xs space-y-2 p-2'>
        <div className='flex justify-between'>
            <span className='font-semibold'>Formula:</span>
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
                <CardTitle>Visualization</CardTitle>
                <CardDescription>Best simulation result: {bestResultMolecule.name}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="min-h-[250px] relative rounded-md border flex items-center justify-center">
                    <Image
                        src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(bestResultMolecule.smiles)}/image?width=250&height=250`}
                        alt={`Structure of ${bestResultMolecule.name}`}
                        width={250}
                        height={250}
                        className="rounded-md bg-white p-2"
                        unoptimized
                    />
                </div>
                <Tabs defaultValue="donors" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="donors">H-Donors</TabsTrigger>
                        <TabsTrigger value="acceptors">H-Acceptors</TabsTrigger>
                    </TabsList>
                    <TabsContent value="donors">
                        <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-center">{bestResultMolecule.donors}</CardTitle>
                        </CardHeader>
                        </Card>
                    </TabsContent>
                    <TabsContent value="acceptors">
                        <Card>
                        <CardHeader className="p-4">
                             <CardTitle className="text-center">{bestResultMolecule.acceptors}</CardTitle>
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
                                        <p className='font-mono'>{mol.formula}</p>
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
