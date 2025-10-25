
export type Molecule = {
  name: string;
  smiles: string;
  formula: string;
};

export const molecules: Molecule[] = [
    { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', formula: 'C9H8O4' },
    { name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', formula: 'C13H18O2' },
    { name: 'Paracetamol', smiles: 'CC(=O)NC1=CC=C(O)C=C1', formula: 'C8H9NO2' },
    { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2' },
    { name: 'Metformin', smiles: 'CN(C)C(=N)N=C(N)N', formula: 'C4H11N5' },
    { name: 'Amoxicillin', smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)C(C3=CC=C(O)C=C3)N)C(=O)O)C', formula: 'C16H19N3O5S' },
    { name: 'Diazepam (Valium)', smiles: 'CN1C2=C(C=C(C=C2)Cl)C(=NC1=O)C3=CC=CC=C3', formula: 'C16H13ClN2O' },
    { name: 'Sertraline (Zoloft)', smiles: 'CN[C@H]1CC[C@@H](C2=CC=CC=C12)C3=CC(=C(C=C3)Cl)Cl', formula: 'C17H17Cl2N' },
    { name: 'Lisinopril', smiles: 'C[C@H](N)C(=O)N1CCC[C@H]1C(=O)N[C@@H](CCCCN)C(=O)O', formula: 'C21H31N3O5' },
    { name: 'Atorvastatin (Lipitor)', smiles: 'CC(C)c1c(c(n(c1c2ccc(cc2)F)C(C)C)CC[C@H](C[C@H](CC(=O)O)O)O)c3ccccc3', formula: 'C33H35FN2O5' },
    { name: 'Imatinib (Gleevec)', smiles: 'Cc1ccc(cc1)c2cc(c(cn2)Nc3ncc(c(n3)C)-c4cccc(c4)C(F)(F)F)C(=O)N5CCN(CC5)C', formula: 'C29H31F3N7O' },
    { name: 'Penicillin G', smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C', formula: 'C16H18N2O4S' },
    { name: 'Ciprofloxacin', smiles: 'C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O', formula: 'C17H18FN3O3' },
    { name: 'Warfarin', smiles: 'CC(=O)CC(C1=C(C=CC=C1)O)C2=C(C(=O)OC3=CC=CC=C23)O', formula: 'C19H16O4' },
    { name: 'Theophylline', smiles: 'CN1C=NC2=C1C(=O)NC(=O)N2C', formula: 'C7H8N4O2' },
    { name: 'Dopamine', smiles: 'C1=CC(=C(C=C1CCN)O)O', formula: 'C8H11NO2' },
    { name: 'Serotonin', smiles: 'C1=CC=C2C(=C1)C(=CN2)CCN', formula: 'C10H12N2O' },
    { name: 'Adrenaline (Epinephrine)', smiles: 'CNC[C@H](C1=CC(=C(C=C1)O)O)O', formula: 'C9H13NO3' },
    { name: 'Glucose', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O)O', formula: 'C6H12O6' },
    { name: 'Fructose', smiles: 'C(C1C(C(C(O1)(CO)O)O)O)O', formula: 'C6H12O6' },
    { name: 'Sucrose', smiles: 'C(C1C(C(C(C(O1)O)O)O)O)OC2(C(C(C(O2)CO)O)O)CO', formula: 'C12H22O11' },
    { name: 'Cholesterol', smiles: 'CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C', formula: 'C27H46O' },
    { name: 'Testosterone', smiles: 'C[C@H]1CC[C@H]2[C@@H]3CCC4=CC(=O)CC[C@]4(C)[C@H]3CC[C@]12C', formula: 'C19H28O2' },
    { name: 'Estradiol', smiles: 'C[C@]12CC[C@H]3[C@H]([C@@H]1CC[C@@H]2O)CCC4=C3C=CC(=C4)O', formula: 'C18H24O2' },
    { name: 'Benzene', smiles: 'c1ccccc1', formula: 'C6H6' },
    { name: 'Ethanol', smiles: 'CCO', formula: 'C2H6O' },
    { name: 'Methanol', smiles: 'CO', formula: 'CH4O'},
    { name: 'Glycerol', smiles: 'C(C(CO)O)O', formula: 'C3H8O3'},
    { name: 'Acetone', smiles: 'CC(=O)C', formula: 'C3H6O'},
    { name: 'Formaldehyde', smiles: 'C=O', formula: 'CH2O'},
    { name: 'Urea', smiles: 'C(=O)(N)N', formula: 'CH4N2O'},
];
