
'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import Image from 'next/image';
import { Card, CardContent } from '../ui/card';

interface MoleculeViewerProps {
  isDocked: boolean;
  selectedSmiles?: string[];
}

export function MoleculeViewer({ isDocked, selectedSmiles = [] }: MoleculeViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    // Only run the 3D animation if docking is complete
    if (!isDocked || !mountRef.current) {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if (mountRef.current) {
            // Clear any previous renderer
            mountRef.current.innerHTML = '';
        }
        return;
    }

    const currentMount = mountRef.current;
    currentMount.innerHTML = ''; // Clear out the 2D images

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('hsl(var(--background))');

    // Camera
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(5, 10, 7.5);
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, -10, -7.5);
    scene.add(directionalLight2);

    // Protein
    const proteinGroup = new THREE.Group();
    const proteinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('hsl(var(--primary))'),
      roughness: 0.6,
      metalness: 0.2,
    });
    const mainShape = new THREE.IcosahedronGeometry(10, 3);
    const protein = new THREE.Mesh(mainShape, proteinMaterial);
    proteinGroup.add(protein);
    scene.add(proteinGroup);

    // Ligand
    const ligand = new THREE.Group();
    const atomPositions = [
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.5, 0.5, 0), new THREE.Vector3(2.5, -0.5, 0),
        new THREE.Vector3(1.0, 1.8, 0), new THREE.Vector3(-1, -1, 0.5), new THREE.Vector3(-1.5, 0.5, -0.5)
    ];
    atomPositions.forEach((pos) => {
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: new THREE.Color('hsl(var(--accent))') });
        const atom = new THREE.Mesh(geometry, material);
        atom.position.copy(pos);
        ligand.add(atom);
    });
    ligand.position.set(6, 1.5, 2); // Start docked
    ligand.scale.set(1.5, 1.5, 1.5);
    scene.add(ligand);

    // Animation
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      proteinGroup.rotation.x += 0.001;
      proteinGroup.rotation.y += 0.002;
      ligand.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (currentMount && renderer.domElement) {
        // Check if the domElement is still a child before removing
        if (currentMount.contains(renderer.domElement)) {
            currentMount.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, [isDocked]);

  return (
    <div ref={mountRef} className="h-full w-full">
      {!isDocked && (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          {selectedSmiles.length === 0 ? (
            <p className="text-muted-foreground">Select molecules to see a preview</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
              {selectedSmiles.map((smiles) => (
                <Card key={smiles} className="p-2 aspect-square flex items-center justify-center bg-muted/50">
                  <Image
                    src={`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/image?width=150&height=150`}
                    alt={`Structure for SMILES: ${smiles}`}
                    width={100}
                    height={100}
                    className="rounded-md bg-white p-1"
                    unoptimized
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
