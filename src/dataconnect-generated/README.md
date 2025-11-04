# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListProteinTargets*](#listproteintargets)
  - [*ListSimulationsForUser*](#listsimulationsforuser)
- [**Mutations**](#mutations)
  - [*CreateMolecule*](#createmolecule)
  - [*UpdateUserInstitution*](#updateuserinstitution)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListProteinTargets
You can execute the `ListProteinTargets` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProteinTargets(): QueryPromise<ListProteinTargetsData, undefined>;

interface ListProteinTargetsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProteinTargetsData, undefined>;
}
export const listProteinTargetsRef: ListProteinTargetsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProteinTargets(dc: DataConnect): QueryPromise<ListProteinTargetsData, undefined>;

interface ListProteinTargetsRef {
  ...
  (dc: DataConnect): QueryRef<ListProteinTargetsData, undefined>;
}
export const listProteinTargetsRef: ListProteinTargetsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProteinTargetsRef:
```typescript
const name = listProteinTargetsRef.operationName;
console.log(name);
```

### Variables
The `ListProteinTargets` query has no variables.
### Return Type
Recall that executing the `ListProteinTargets` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProteinTargetsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProteinTargetsData {
  proteinTargets: ({
    id: UUIDString;
    name: string;
    functionDescription?: string | null;
  } & ProteinTarget_Key)[];
}
```
### Using `ListProteinTargets`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProteinTargets } from '@dataconnect/generated';


// Call the `listProteinTargets()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProteinTargets();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProteinTargets(dataConnect);

console.log(data.proteinTargets);

// Or, you can use the `Promise` API.
listProteinTargets().then((response) => {
  const data = response.data;
  console.log(data.proteinTargets);
});
```

### Using `ListProteinTargets`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProteinTargetsRef } from '@dataconnect/generated';


// Call the `listProteinTargetsRef()` function to get a reference to the query.
const ref = listProteinTargetsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProteinTargetsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.proteinTargets);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.proteinTargets);
});
```

## ListSimulationsForUser
You can execute the `ListSimulationsForUser` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listSimulationsForUser(vars: ListSimulationsForUserVariables): QueryPromise<ListSimulationsForUserData, ListSimulationsForUserVariables>;

interface ListSimulationsForUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSimulationsForUserVariables): QueryRef<ListSimulationsForUserData, ListSimulationsForUserVariables>;
}
export const listSimulationsForUserRef: ListSimulationsForUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSimulationsForUser(dc: DataConnect, vars: ListSimulationsForUserVariables): QueryPromise<ListSimulationsForUserData, ListSimulationsForUserVariables>;

interface ListSimulationsForUserRef {
  ...
  (dc: DataConnect, vars: ListSimulationsForUserVariables): QueryRef<ListSimulationsForUserData, ListSimulationsForUserVariables>;
}
export const listSimulationsForUserRef: ListSimulationsForUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSimulationsForUserRef:
```typescript
const name = listSimulationsForUserRef.operationName;
console.log(name);
```

### Variables
The `ListSimulationsForUser` query requires an argument of type `ListSimulationsForUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListSimulationsForUserVariables {
  userId: UUIDString;
}
```
### Return Type
Recall that executing the `ListSimulationsForUser` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSimulationsForUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListSimulationsForUserData {
  simulations: ({
    id: UUIDString;
    bindingAffinityResult: string;
    simulationDate: TimestampString;
  } & Simulation_Key)[];
}
```
### Using `ListSimulationsForUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSimulationsForUser, ListSimulationsForUserVariables } from '@dataconnect/generated';

// The `ListSimulationsForUser` query requires an argument of type `ListSimulationsForUserVariables`:
const listSimulationsForUserVars: ListSimulationsForUserVariables = {
  userId: ..., 
};

// Call the `listSimulationsForUser()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSimulationsForUser(listSimulationsForUserVars);
// Variables can be defined inline as well.
const { data } = await listSimulationsForUser({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSimulationsForUser(dataConnect, listSimulationsForUserVars);

console.log(data.simulations);

// Or, you can use the `Promise` API.
listSimulationsForUser(listSimulationsForUserVars).then((response) => {
  const data = response.data;
  console.log(data.simulations);
});
```

### Using `ListSimulationsForUser`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSimulationsForUserRef, ListSimulationsForUserVariables } from '@dataconnect/generated';

// The `ListSimulationsForUser` query requires an argument of type `ListSimulationsForUserVariables`:
const listSimulationsForUserVars: ListSimulationsForUserVariables = {
  userId: ..., 
};

// Call the `listSimulationsForUserRef()` function to get a reference to the query.
const ref = listSimulationsForUserRef(listSimulationsForUserVars);
// Variables can be defined inline as well.
const ref = listSimulationsForUserRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSimulationsForUserRef(dataConnect, listSimulationsForUserVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.simulations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.simulations);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateMolecule
You can execute the `CreateMolecule` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createMolecule(): MutationPromise<CreateMoleculeData, undefined>;

interface CreateMoleculeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateMoleculeData, undefined>;
}
export const createMoleculeRef: CreateMoleculeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMolecule(dc: DataConnect): MutationPromise<CreateMoleculeData, undefined>;

interface CreateMoleculeRef {
  ...
  (dc: DataConnect): MutationRef<CreateMoleculeData, undefined>;
}
export const createMoleculeRef: CreateMoleculeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMoleculeRef:
```typescript
const name = createMoleculeRef.operationName;
console.log(name);
```

### Variables
The `CreateMolecule` mutation has no variables.
### Return Type
Recall that executing the `CreateMolecule` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMoleculeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMoleculeData {
  molecule_insert: Molecule_Key;
}
```
### Using `CreateMolecule`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMolecule } from '@dataconnect/generated';


// Call the `createMolecule()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMolecule();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMolecule(dataConnect);

console.log(data.molecule_insert);

// Or, you can use the `Promise` API.
createMolecule().then((response) => {
  const data = response.data;
  console.log(data.molecule_insert);
});
```

### Using `CreateMolecule`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMoleculeRef } from '@dataconnect/generated';


// Call the `createMoleculeRef()` function to get a reference to the mutation.
const ref = createMoleculeRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMoleculeRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.molecule_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.molecule_insert);
});
```

## UpdateUserInstitution
You can execute the `UpdateUserInstitution` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateUserInstitution(vars: UpdateUserInstitutionVariables): MutationPromise<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;

interface UpdateUserInstitutionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserInstitutionVariables): MutationRef<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
}
export const updateUserInstitutionRef: UpdateUserInstitutionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateUserInstitution(dc: DataConnect, vars: UpdateUserInstitutionVariables): MutationPromise<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;

interface UpdateUserInstitutionRef {
  ...
  (dc: DataConnect, vars: UpdateUserInstitutionVariables): MutationRef<UpdateUserInstitutionData, UpdateUserInstitutionVariables>;
}
export const updateUserInstitutionRef: UpdateUserInstitutionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserInstitutionRef:
```typescript
const name = updateUserInstitutionRef.operationName;
console.log(name);
```

### Variables
The `UpdateUserInstitution` mutation requires an argument of type `UpdateUserInstitutionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateUserInstitutionVariables {
  id: UUIDString;
  institution: string;
}
```
### Return Type
Recall that executing the `UpdateUserInstitution` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserInstitutionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateUserInstitutionData {
  user_update?: User_Key | null;
}
```
### Using `UpdateUserInstitution`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUserInstitution, UpdateUserInstitutionVariables } from '@dataconnect/generated';

// The `UpdateUserInstitution` mutation requires an argument of type `UpdateUserInstitutionVariables`:
const updateUserInstitutionVars: UpdateUserInstitutionVariables = {
  id: ..., 
  institution: ..., 
};

// Call the `updateUserInstitution()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUserInstitution(updateUserInstitutionVars);
// Variables can be defined inline as well.
const { data } = await updateUserInstitution({ id: ..., institution: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUserInstitution(dataConnect, updateUserInstitutionVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateUserInstitution(updateUserInstitutionVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateUserInstitution`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserInstitutionRef, UpdateUserInstitutionVariables } from '@dataconnect/generated';

// The `UpdateUserInstitution` mutation requires an argument of type `UpdateUserInstitutionVariables`:
const updateUserInstitutionVars: UpdateUserInstitutionVariables = {
  id: ..., 
  institution: ..., 
};

// Call the `updateUserInstitutionRef()` function to get a reference to the mutation.
const ref = updateUserInstitutionRef(updateUserInstitutionVars);
// Variables can be defined inline as well.
const ref = updateUserInstitutionRef({ id: ..., institution: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserInstitutionRef(dataConnect, updateUserInstitutionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

