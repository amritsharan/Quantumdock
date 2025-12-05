
import { z } from 'zod';

export const CreateLoginHistoryRequest = z.object({
  status: z.enum(['active', 'inactive']),
});
export type CreateLoginHistoryRequest = z.infer<
  typeof CreateLoginHistoryRequest
>;

export const UpdateLoginHistoryRequest = z.object({
  loginHistoryId: z.string(),
  status: z.enum(['active', 'inactive']),
});
export type UpdateLoginHistoryRequest = z.infer<
  typeof UpdateLoginHistoryRequest
>;

export const CreateDockingSimulationRequest = z.object({
  loginHistoryId: z.string(),
  moleculeSmiles: z.string(),
  proteinTarget: z.string(),
  bindingAffinity: z.number(),
});
export type CreateDockingSimulationRequest = z.infer<
  typeof CreateDockingSimulationRequest
>;

export const CreateDockingResultRequest = z.object({
  moleculeId: z.string(),
  targetProteinId: z.string(),
  dockingScore: z.number(),
  refinedEnergy: z.number(),
  pose: z.string(),
  bindingAffinity: z.number(),
});
export type CreateDockingResultRequest = z.infer<
  typeof CreateDockingResultRequest
>;
