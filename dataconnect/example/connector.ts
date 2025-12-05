
import {
  createConnector,
  createFirebaseBackedConnector,
} from 'firebase-dataconnect';
import type {
  CreateLoginHistoryRequest,
  CreateDockingResultRequest,
  CreateDockingSimulationRequest,
  UpdateLoginHistoryRequest,
} from './types.js';

// This is a normal connector that uses the Admin SDK
export default createConnector({
  'Users.create'(req, context) {
    return context.app.admin.firestore().collection('users').doc().create({
      ...req,
      // Overwrite `uid` from the request with the one from the authenticated user.
      uid: context.auth!.uid,
    });
  },
});

export const firebaseBacked = createFirebaseBackedConnector({
  // Note: This needs to match the `collection` in `dataconnect/schema/dataconnect.gql`.
  User: {
    // This is a special syntax that tells Data Connect to use the user's UID as the document ID.
    key: '{uid}',
    // This will create a `User` when `Users.create` is called.
    // The result of `Users.create` is a `WriteResult`, which has a `name` property.
    // We use the `name` property (the document path) to extract the `uid` and return it.
    onCreate: {
      action: 'Users.create',
      resource: (result, req, context) => ({
        name: result.name,
      }),
    },
    onGet: true,
    onList: true,
  },
  LoginHistory: {
    // Because `LoginHistory` is a sub-collection of `User`, the `parent` field tells Data Connect
    // how to construct the path to the document.
    parent: 'User',
    key: '{loginHistoryId}',
    fields: {
      createLoginHistory: {
        request: CreateLoginHistoryRequest,
        // The `action` is a function that will be called when `LoginHistory.createLoginHistory` is called.
        // It will receive the request and the context, which contains information about the authenticated user.
        action: (req, context) => {
          // It uses the Admin SDK to create a new document in the `loginHistory` sub-collection of the current user.
          return context.app.admin
            .firestore()
            .collection('users')
            .doc(context.auth!.uid)
            .collection('loginHistory')
            .add({
              ...req,
              loginTime: new Date(),
            });
        },
        resource: (result, req, context) => ({
          // After the action is complete, we construct a resource object that tells Data Connect
          // where to find the newly created document.
          name: result.path,
        }),
      },
      updateLoginHistory: {
        request: UpdateLoginHistoryRequest,
        action: async (req, context) => {
          const docRef = context.app.admin
            .firestore()
            .collection('users')
            .doc(context.auth!.uid)
            .collection('loginHistory')
            .doc(req.loginHistoryId);

          const doc = await docRef.get();
          if (!doc.exists) {
            throw new Error('Login history not found');
          }
          const loginTime = doc.data()!.loginTime.toDate();
          const logoutTime = new Date();
          const duration = Math.round(
            (logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)
          );

          await docRef.update({
            ...req,
            logoutTime,
            duration,
          });
          return docRef;
        },
        resource: (result, req, context) => ({
          name: result.path,
        }),
      },
    },
  },
  DockingSimulation: {
    parent: 'LoginHistory',
    key: '{dockingSimulationId}',
    fields: {
      createDockingSimulation: {
        request: CreateDockingSimulationRequest,
        action: (req, context) => {
          return context.app.admin
            .firestore()
            .collection('users')
            .doc(context.auth!.uid)
            .collection('loginHistory')
            .doc(req.loginHistoryId)
            .collection('dockingSimulations')
            .add({
              ...req,
              timestamp: new Date(),
            });
        },
        resource: (result, req, context) => ({
          name: result.path,
        }),
      },
    },
  },
  DockingResult: {
    parent: 'User',
    key: '{dockingResultId}',
    fields: {
      createDockingResult: {
        request: CreateDockingResultRequest,
        action: (req, context) => {
          return context.app.admin
            .firestore()
            .collection('users')
            .doc(context.auth!.uid)
            .collection('dockingResults')
            .add({
              ...req,
              createdAt: new Date(),
            });
        },
        resource: (result, req, context) => ({
          name: result.path,
        }),
      },
    },
  },
});
