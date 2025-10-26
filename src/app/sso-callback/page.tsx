'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SSOCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    async function processCallback() {
      try {
        await handleRedirectCallback();
        router.push('/');
      } catch (error) {
        console.error('SSO callback error:', error);
        router.push('/sign-in');
      }
    }
    processCallback();
  }, [handleRedirectCallback, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  );
}
