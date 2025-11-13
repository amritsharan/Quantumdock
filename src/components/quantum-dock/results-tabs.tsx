
'use client';

import { useMemo, useState, useTransition } from 'react';
import { ResultsDisplay } from '@/components/quantum-dock/results-display';
import type { DockingResults } from '@/lib/schema';
import { LiteratureAnalysis } from './literature-analysis';


type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ResultsContainerProps {
  results: DockingResults[];
  saveState: SaveState;
  onSave: () => void;
}

export function ResultsContainer({ results, saveState, onSave }: ResultsContainerProps) {
  
  return (
    <div className="space-y-6">
        <ResultsDisplay results={results} onSave={onSave} saveState={saveState} />
        <LiteratureAnalysis results={results} />
    </div>
  );
}
