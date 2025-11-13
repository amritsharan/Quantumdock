
'use client';

import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';

function DashboardPage() {
  return (
    <>
      <main className="flex min-h-[calc(100vh_-_4rem)] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to QuantumDock</CardTitle>
                <CardDescription>
                    The docking simulation functionality has been reset. Please provide instructions to build it again.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <QuantumDockLogo className="h-24 w-24 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Ready for a fresh start.</p>
              </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardPage />
        </Suspense>
    )
}
