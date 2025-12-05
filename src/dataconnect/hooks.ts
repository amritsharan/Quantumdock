import {
  useCreateLoginHistory as useCreateLoginHistoryFDC,
  useUpdateLoginHistory as useUpdateLoginHistoryFDC,
  useCreateDockingSimulation as useCreateDockingSimulationFDC,
  useCreateDockingResult as useCreateDockingResultFDC,
} from './generated/react';
import { useMemo } from 'react';
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from './generated';
import { useFirebaseApp } from '@/firebase';

export function useDataConnect() {
  const app = useFirebaseApp();
  return useMemo(() => getDataConnect(app, connectorConfig), [app]);
}

export function useCreateLoginHistory() {
  const fdc = useDataConnect();
  return useCreateLoginHistoryFDC(fdc);
}

export function useUpdateLoginHistory() {
  const fdc = useDataConnect();
  return useUpdateLoginHistoryFDC(fdc);
}

export function useCreateDockingSimulation() {
  const fdc = useDataConnect();
  return useCreateDockingSimulationFDC(fdc);
}

export function useCreateDockingResult() {
  const fdc = useDataConnect();
  return useCreateDockingResultFDC(fdc);
}
