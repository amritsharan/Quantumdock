'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface MoleculeViewerProps {
  isDocked: boolean;
}

export function MoleculeViewer({ isDocked }: MoleculeViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('hsl(var(--background))');

    // Camera
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 20;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Protein (Icosahedron)
    const proteinGeometry = new THREE.IcosahedronGeometry(8, 1);
    const proteinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('hsl(var(--primary))'),
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
    });
    const protein = new THREE.Mesh(proteinGeometry, proteinMaterial);
    scene.add(protein);

    // Ligand (group of spheres)
    const ligand = new THREE.Group();
    const atomColors = [0x4DB6AC, 0x2E5266, 0xF0F4F7];
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: atomColors[i % atomColors.length],
        roughness: 0.3,
      });
      const atom = new THREE.Mesh(geometry, material);
      atom.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
      );
      ligand.add(atom);
    }
    ligand.position.set(10, 5, 0);
    scene.add(ligand);

    // Animation
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      protein.rotation.x += 0.001;
      protein.rotation.y += 0.002;

      ligand.rotation.y += 0.005;

      // Docking animation
      const targetPosition = isDocked ? new THREE.Vector3(5.5, 0, 0) : new THREE.Vector3(10, 5, 0);
      ligand.position.lerp(targetPosition, 0.05);

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      currentMount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [isDocked]);

  return <div ref={mountRef} className="h-full w-full" data-ai-hint="3d molecule" />;
}
