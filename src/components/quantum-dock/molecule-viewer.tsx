
'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BrainCircuit } from 'lucide-react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

interface MoleculeViewerProps {
  isDocked: boolean;
  selectedSmiles?: string[];
  bestSmiles?: string | null;
}

export function MoleculeViewer({ isDocked, selectedSmiles, bestSmiles }: MoleculeViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    // This effect is now only for cleanup and doesn't run the animation
    const currentAnimationFrameId = animationFrameId.current;
    return () => {
      if(currentAnimationFrameId) cancelAnimationFrame(currentAnimationFrameId);
    };
  }, []);
  
  const hasSelection = selectedSmiles && selectedSmiles.length > 0;
  const smilesToDisplayAfterDocking = isDocked ? bestSmiles : null;


  return (
    <div ref={mountRef} className="h-full w-full">
      {!hasSelection && !smilesToDisplayAfterDocking && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <BrainCircuit className="h-24 w-24 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Select molecule(s) to see their structure. After simulation, the structure of the best result will appear here.
          </p>
        </div>
      )}

      {smilesToDisplayAfterDocking && (
         <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <Image
            src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smilesToDisplayAfterDocking)}/image?width=250&height=250`}
            alt={`Structure of ${smilesToDisplayAfterDocking}`}
            width={250}
            height={250}
            className="rounded-md bg-white p-2"
            unoptimized
          />
          <p className="text-center text-sm text-muted-foreground">
            2D structure of the best simulation result.
          </p>
        </div>
      )}

      {!isDocked && hasSelection && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
            <Carousel className="w-full max-w-xs">
              <CarouselContent>
                {selectedSmiles!.map((smiles, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                       <div className="flex aspect-square items-center justify-center p-6">
                         <Image
                            src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/image?width=200&height=200`}
                            alt={`Structure of ${smiles}`}
                            width={200}
                            height={200}
                            className="rounded-md bg-white p-2"
                            unoptimized
                          />
                       </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
             <p className="text-center text-sm text-muted-foreground">
                Displaying {selectedSmiles!.length} selected molecule(s). Run simulation to see best result.
            </p>
        </div>
      )}
    </div>
  );
}
