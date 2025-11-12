
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
            <span className='font-semibold'>Mol. Weight:</span>
            <span className='font-mono'>{molecule.molecularWeight.toFixed(2)}</span>
        </div>
        <div className='flex justify-between'>
            <span className='font-semibold'>H-Donors:</span>
            <Badge variant="secondary">{molecule.donors}</Badge>
        </div>
         <div className='flex justify-between'>
            <span className='font-semibold'>H-Acceptors:</span>
            <Badge variant="secondary">{molecule.acceptors}</Badge>
        </div>
    </div>
);

export function MoleculeViewer({ isDocked, molecules, bestResultMolecule }: MoleculeViewerProps) {

  const hasSelection = molecules && molecules.length > 0;
  
  if (!hasSelection && !bestResultMolecule) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <BrainCircuit className="h-24 w-24 text-muted-foreground" />
        <p className="text-center text-muted-foreground">
          Select molecule(s) to see their structure. After simulation, the best result will appear here.
        </p>
      </div>
    );
  }

  if (isDocked && bestResultMolecule) {
     return (
       <div className="flex h-full flex-col items-center justify-center gap-4 p-4 w-full">
          <Image
            src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(bestResultMolecule.smiles)}/image?width=250&height=250`}
            alt={`Structure of ${bestResultMolecule.name}`}
            width={250}
            height={250}
            className="rounded-md bg-white p-2"
            unoptimized
          />
          <Card className="w-full max-w-sm">
            <CardHeader className='p-3'>
                <CardTitle className='text-base'>{bestResultMolecule.name}</CardTitle>
                <CardDescription className='text-xs'>Best simulation result</CardDescription>
            </CardHeader>
            <CardContent className='p-3 pt-0'>
                <MoleculeProperties molecule={bestResultMolecule} />
            </CardContent>
          </Card>
        </div>
      );
  }
  
  if (!isDocked && hasSelection) {
    return (
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
                            <p className='font-mono'>MW: {mol.molecularWeight.toFixed(2)}</p>
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
    );
  }

  return null;
}
