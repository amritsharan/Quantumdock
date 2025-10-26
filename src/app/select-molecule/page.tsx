
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { molecules, type Molecule } from '@/lib/molecules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { QuantumDockLogo } from '@/components/quantum-dock/logo';
import Image from 'next/image';

const ITEMS_PER_PAGE = 10;

export default function SelectMoleculePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSmiles, setSelectedSmiles] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMolecules = useMemo(() => {
    if (!searchTerm) {
      return molecules;
    }
    return molecules.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.formula.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredMolecules.length / ITEMS_PER_PAGE);
  const paginatedMolecules = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMolecules.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMolecules, currentPage]);

  const handleSelect = (smiles: string, checked: boolean | 'indeterminate') => {
    const newSet = new Set(selectedSmiles);
    if (checked) {
      newSet.add(smiles);
    } else {
      newSet.delete(smiles);
    }
    setSelectedSmiles(newSet);
  };

  const handleSelectAllOnPage = (checked: boolean | 'indeterminate') => {
      const newSet = new Set(selectedSmiles);
      paginatedMolecules.forEach(m => {
          if (checked) {
              newSet.add(m.smiles);
          } else {
              newSet.delete(m.smiles);
          }
      });
      setSelectedSmiles(newSet);
  };

  const isAllOnPageSelected = paginatedMolecules.length > 0 && paginatedMolecules.every(m => selectedSmiles.has(m.smiles));

  const handleConfirm = () => {
    const smilesQuery = encodeURIComponent(JSON.stringify(Array.from(selectedSmiles)));
    router.push(`/?smiles=${smilesQuery}`);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <QuantumDockLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QuantumDock</h1>
        </div>
        <Button asChild variant="outline">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Simulation
            </Link>
        </Button>
      </header>
      <main className="flex flex-1 justify-center p-4 md:p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Select Molecules</CardTitle>
          <CardDescription>
            Search and select one or more molecules for the docking simulation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Search by name or molecular formula..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on new search
              }}
              suppressHydrationWarning
            />
            <ScrollArea className="h-[50vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={isAllOnPageSelected}
                        onCheckedChange={handleSelectAllOnPage}
                        aria-label="Select all on page"
                        suppressHydrationWarning
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Molecular Formula</TableHead>
                    <TableHead>Structure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMolecules.map((molecule) => (
                    <TableRow key={molecule.smiles}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSmiles.has(molecule.smiles)}
                          onCheckedChange={(checked) => handleSelect(molecule.smiles, checked)}
                          suppressHydrationWarning
                        />

                      </TableCell>
                      <TableCell className="font-medium">{molecule.name}</TableCell>
                      <TableCell>{molecule.formula}</TableCell>
                       <TableCell>
                        <Image
                          src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(molecule.smiles)}/image?width=100&height=100`}
                          alt={`Structure of ${molecule.name}`}
                          width={100}
                          height={100}
                          className="rounded-md bg-white p-1"
                          unoptimized // External URLs can't be optimized by Next/image by default
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Selected {selectedSmiles.size} molecule(s).
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
            <Button onClick={handleConfirm} disabled={selectedSmiles.size === 0}>
              Confirm Selection ({selectedSmiles.size})
            </Button>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
