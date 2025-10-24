
'use client';

import { useContext } from 'react';
import { FirebaseContext } from '../provider';

export const useUser = () => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider');
  }

  // The context from FirebaseProvider provides { user, loading }
  return context;
};
