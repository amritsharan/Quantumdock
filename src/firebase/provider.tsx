
'use client';

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useEffect, useState, type ReactNode, useContext } from 'react';
import app from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface IFirebaseContext {
  user: User | null;
  loading: boolean;
}

export const FirebaseContext = createContext<IFirebaseContext | undefined>(undefined);

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
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
}
