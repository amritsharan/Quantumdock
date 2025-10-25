
'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import { proteins as proteinOptions } from '@/lib/proteins';
import { Suspense } from 'react';

const ITEMS_PER_PAGE = 10;

function SelectProteinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProtein, setSelectedProtein] = useState<string>(searchParams.get('protein') || '');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProteins = useMemo(() => {
    if (!searchTerm) {
      return proteinOptions;
    }
    return proteinOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredProteins.length / ITEMS_PER_PAGE);
  const paginatedProteins = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProteins.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProteins, currentPage]);

  const buildQueryString = (newProtein: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('protein', newProtein);
    return params.toString();
  };

  const handleConfirm = () => {
    if (selectedProtein) {
      const queryString = buildQueryString(selectedProtein);
      router.push(`/?${queryString}`);
    }
  };

  const backLink = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    // Don't persist the new selection on 'back'
    params.delete('protein'); 
    return `/?${params.toString()}`;
  }, [searchParams]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={backLink}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Simulation
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 justify-center p-4 md:p-6">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Select Protein Target</CardTitle>
            <CardDescription>
              Search and select a protein for the docking simulation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                suppressHydrationWarning
              />
              <ScrollArea className="h-[50vh] rounded-md border">
                <RadioGroup value={selectedProtein} onValueChange={setSelectedProtein}>
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProteins.map((protein) => (
                        <TableRow key={protein.name}>
                          <TableCell>
                            <RadioGroupItem value={protein.name} id={protein.name} />
                          </TableCell>
                          <TableCell>
                            <Label htmlFor={protein.name} className="font-medium cursor-pointer">{protein.name}</Label>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{protein.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </RadioGroup>
              </ScrollArea>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedProteins.length} of {filteredProteins.length} proteins.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <Button onClick={handleConfirm} disabled={!selectedProtein}>
                Confirm Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


export default function SelectProteinPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SelectProteinContent />
        </Suspense>
    )
}
