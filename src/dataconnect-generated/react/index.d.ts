import { CreateMoleculeData, ListProteinTargetsData, UpdateUserInstitutionData, UpdateUserInstitutionVariables, ListSimulationsForUserData, ListSimulationsForUserVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateMolecule(options?: useDataConnectMutationOptions<CreateMoleculeData, FirebaseError, void>): UseDataConnectMutationResult<CreateMoleculeData, undefined>;
export function useCreateMolecule(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMoleculeData, FirebaseError, void>): UseDataConnectMutationResult<CreateMoleculeData, undefined>;

export function useListProteinTargets(options?: useDataConnectQueryOptions<ListProteinTargetsData>): UseDataConnectQueryResult<ListProteinTargetsData, undefined>;
export function useListProteinTargets(dc: DataConnect, options?: useDataConnectQueryOptions<ListProteinTargetsData>): UseDataConnectQueryResult<ListProteinTargetsData, undefined>;

export function useUpdateUserInstitution(options?: useDataConnectMutationOptions<UpdateUserInstitutionData, FirebaseError, UpdateUserInstitutionVariables>): UseDataConnectMutationResult<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
export function useUpdateUserInstitution(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateUserInstitutionData, FirebaseError, UpdateUserInstitutionVariables>): UseDataConnectMutationResult<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;

export function useListSimulationsForUser(vars: ListSimulationsForUserVariables, options?: useDataConnectQueryOptions<ListSimulationsForUserData>): UseDataConnectQueryResult<ListSimulationsForUserData, ListSimulationsForUserVariables>;
export function useListSimulationsForUser(dc: DataConnect, vars: ListSimulationsForUserVariables, options?: useDataConnectQueryOptions<ListSimulationsForUserData>): UseDataConnectQueryResult<ListSimulationsForUserData, ListSimulationsForUserVariables>;
