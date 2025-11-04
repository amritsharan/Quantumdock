import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-east4'
};

export const createMoleculeRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMolecule');
}
createMoleculeRef.operationName = 'CreateMolecule';

export function createMolecule(dc) {
  return executeMutation(createMoleculeRef(dc));
}

export const listProteinTargetsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProteinTargets');
}
listProteinTargetsRef.operationName = 'ListProteinTargets';

export function listProteinTargets(dc) {
  return executeQuery(listProteinTargetsRef(dc));
}

export const updateUserInstitutionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateUserInstitution', inputVars);
}
updateUserInstitutionRef.operationName = 'UpdateUserInstitution';

export function updateUserInstitution(dcOrVars, vars) {
  return executeMutation(updateUserInstitutionRef(dcOrVars, vars));
}

export const listSimulationsForUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSimulationsForUser', inputVars);
}
listSimulationsForUserRef.operationName = 'ListSimulationsForUser';

export function listSimulationsForUser(dcOrVars, vars) {
  return executeQuery(listSimulationsForUserRef(dcOrVars, vars));
}

