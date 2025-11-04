# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateMolecule, useListProteinTargets, useUpdateUserInstitution, useListSimulationsForUser } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateMolecule();

const { data, isPending, isSuccess, isError, error } = useListProteinTargets();

const { data, isPending, isSuccess, isError, error } = useUpdateUserInstitution(updateUserInstitutionVars);

const { data, isPending, isSuccess, isError, error } = useListSimulationsForUser(listSimulationsForUserVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createMolecule, listProteinTargets, updateUserInstitution, listSimulationsForUser } from '@dataconnect/generated';


// Operation CreateMolecule: 
const { data } = await CreateMolecule(dataConnect);

// Operation ListProteinTargets: 
const { data } = await ListProteinTargets(dataConnect);

// Operation UpdateUserInstitution:  For variables, look at type UpdateUserInstitutionVars in ../index.d.ts
const { data } = await UpdateUserInstitution(dataConnect, updateUserInstitutionVars);

// Operation ListSimulationsForUser:  For variables, look at type ListSimulationsForUserVars in ../index.d.ts
const { data } = await ListSimulationsForUser(dataConnect, listSimulationsForUserVars);


```