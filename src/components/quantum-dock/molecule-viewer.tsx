
'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BrainCircuit } from 'lucide-react';
import Image from 'next/image';

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
  const smilesToDisplay = isDocked ? bestSmiles : (hasSelection ? selectedSmiles[0] : null);
  const displayMoleculeName = isDocked ? "best simulation result" : "primary selected molecule";
  const displayMessage = isDocked ? `2D structure of the ${displayMoleculeName}.` : `2D structure of the ${displayMoleculeName}.\nRun the simulation to see the docked complex.`;


  return (
    <div ref={mountRef} className="h-full w-full">
      {!smilesToDisplay && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <BrainCircuit className="h-24 w-24 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Select a molecule to see its structure. After simulation, the structure of the best result will appear here.
          </p>
        </div>
      )}
      {smilesToDisplay && (
         <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <Image
            src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smilesToDisplay)}/image?width=250&height=250`}
            alt={`Structure of ${smilesToDisplay}`}
            width={250}
            height={250}
            className="rounded-md bg-white p-2"
            unoptimized
          />
          <p className="text-center text-sm text-muted-foreground whitespace-pre-line">
            {displayMessage}
          </p>
        </div>
      )}
    </div>
  );
}
