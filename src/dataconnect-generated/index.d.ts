import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateMoleculeData {
  molecule_insert: Molecule_Key;
}

export interface Disease_Key {
  id: UUIDString;
  __typename?: 'Disease_Key';
}

export interface ListProteinTargetsData {
  proteinTargets: ({
    id: UUIDString;
    name: string;
    functionDescription?: string | null;
  } & ProteinTarget_Key)[];
}

export interface ListSimulationsForUserData {
  simulations: ({
    id: UUIDString;
    bindingAffinityResult: string;
    simulationDate: TimestampString;
  } & Simulation_Key)[];
}

export interface ListSimulationsForUserVariables {
  userId: UUIDString;
}

export interface Molecule_Key {
  id: UUIDString;
  __typename?: 'Molecule_Key';
}

export interface ProteinTarget_Key {
  id: UUIDString;
  __typename?: 'ProteinTarget_Key';
}

export interface Simulation_Key {
  id: UUIDString;
  __typename?: 'Simulation_Key';
}

export interface UpdateUserInstitutionData {
  user_update?: User_Key | null;
}

export interface UpdateUserInstitutionVariables {
  id: UUIDString;
  institution: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateMoleculeRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateMoleculeData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateMoleculeData, undefined>;
  operationName: string;
}
export const createMoleculeRef: CreateMoleculeRef;

export function createMolecule(): MutationPromise<CreateMoleculeData, undefined>;
export function createMolecule(dc: DataConnect): MutationPromise<CreateMoleculeData, undefined>;

interface ListProteinTargetsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProteinTargetsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProteinTargetsData, undefined>;
  operationName: string;
}
export const listProteinTargetsRef: ListProteinTargetsRef;

export function listProteinTargets(): QueryPromise<ListProteinTargetsData, undefined>;
export function listProteinTargets(dc: DataConnect): QueryPromise<ListProteinTargetsData, undefined>;

interface UpdateUserInstitutionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserInstitutionVariables): MutationRef<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateUserInstitutionVariables): MutationRef<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
  operationName: string;
}
export const updateUserInstitutionRef: UpdateUserInstitutionRef;

export function updateUserInstitution(vars: UpdateUserInstitutionVariables): MutationPromise<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
export function updateUserInstitution(dc: DataConnect, vars: UpdateUserInstitutionVariables): MutationPromise<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;

interface ListSimulationsForUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSimulationsForUserVariables): QueryRef<ListSimulationsForUserData, ListSimulationsForUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListSimulationsForUserVariables): QueryRef<ListSimulationsForUserData, ListSimulationsForUserVariables>;
  operationName: string;
}
export const listSimulationsForUserRef: ListSimulationsForUserRef;

export function listSimulationsForUser(vars: ListSimulationsForUserVariables): QueryPromise<ListSimulationsForUserData, ListSimulationsForUserVariables>;
export function listSimulationsForUser(dc: DataConnect, vars: ListSimulationsForUserVariables): QueryPromise<ListSimulationsForUserData, ListSimulationsForUserVariables>;

