
'use client';

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useEffect, useState, type ReactNode } from 'react';
import app from './config';

interface IFirebaseContext {
  user: User | null;
  loading: boolean;
}

export const FirebaseContext = createContext<IFirebaseContext>({
  user: null,
  loading: true,
});

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
