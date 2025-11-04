const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createMoleculeRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMolecule');
}
createMoleculeRef.operationName = 'CreateMolecule';
exports.createMoleculeRef = createMoleculeRef;

exports.createMolecule = function createMolecule(dc) {
  return executeMutation(createMoleculeRef(dc));
};

const listProteinTargetsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProteinTargets');
}
listProteinTargetsRef.operationName = 'ListProteinTargets';
exports.listProteinTargetsRef = listProteinTargetsRef;

exports.listProteinTargets = function listProteinTargets(dc) {
  return executeQuery(listProteinTargetsRef(dc));
};

const updateUserInstitutionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateUserInstitution', inputVars);
}
updateUserInstitutionRef.operationName = 'UpdateUserInstitution';
exports.updateUserInstitutionRef = updateUserInstitutionRef;

exports.updateUserInstitution = function updateUserInstitution(dcOrVars, vars) {
  return executeMutation(updateUserInstitutionRef(dcOrVars, vars));
};

const listSimulationsForUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSimulationsForUser', inputVars);
}
listSimulationsForUserRef.operationName = 'ListSimulationsForUser';
exports.listSimulationsForUserRef = listSimulationsForUserRef;

exports.listSimulationsForUser = function listSimulationsForUser(dcOrVars, vars) {
  return executeQuery(listSimulationsForUserRef(dcOrVars, vars));
};
