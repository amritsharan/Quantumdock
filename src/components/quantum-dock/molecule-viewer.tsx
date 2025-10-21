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

    // Protein (More complex shape)
    const proteinGroup = new THREE.Group();
    const proteinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('hsl(var(--primary))'),
      roughness: 0.6,
      metalness: 0.2,
    });

    const mainShape = new THREE.IcosahedronGeometry(10, 3);
    const modulator = new THREE.TextureLoader().load('https://picsum.photos/seed/disp/512/512');
    modulator.wrapS = THREE.RepeatWrapping;
    modulator.wrapT = THREE.RepeatWrapping;

    const displacedGeometry = mainShape.clone();
    const tempVertex = new THREE.Vector3();
    for (let i = 0; i < displacedGeometry.attributes.position.count; i++) {
        tempVertex.fromBufferAttribute(displacedGeometry.attributes.position, i);
        const noise = (Math.random() - 0.5) * 2; // Add some random noise
        tempVertex.multiplyScalar(1 + noise * 0.05);
        displacedGeometry.attributes.position.setXYZ(i, tempVertex.x, tempVertex.y, tempVertex.z);
    }
    displacedGeometry.computeVertexNormals();


    const protein = new THREE.Mesh(displacedGeometry, proteinMaterial);
    proteinGroup.add(protein);
    
    // Add some smaller spheres to represent subunits or domains
    for (let i = 0; i < 15; i++) {
        const subGeom = new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 8);
        const subMesh = new THREE.Mesh(subGeom, proteinMaterial);
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos((Math.random() * 2) - 1);
        subMesh.position.setFromSphericalCoords(9, phi, theta);
        proteinGroup.add(subMesh);
    }
    scene.add(proteinGroup);


    // Ligand (Atoms and Bonds)
    const ligand = new THREE.Group();
    const atomPositions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.5, 0.5, 0),
        new THREE.Vector3(2.5, -0.5, 0),
        new THREE.Vector3(1.0, 1.8, 0),
        new THREE.Vector3(-1, -1, 0.5),
        new THREE.Vector3(-1.5, 0.5, -0.5)
    ];
    const atomColors = [0x4DB6AC, 0x2E5266, 0xF0F4F7, 0x4DB6AC, 0x2E5266, 0xF0F4F7];

    // Atoms
    atomPositions.forEach((pos, i) => {
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: atomColors[i % atomColors.length] });
        const atom = new THREE.Mesh(geometry, material);
        atom.position.copy(pos);
        ligand.add(atom);
    });

    // Bonds
    const bondMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    for (let i = 0; i < atomPositions.length; i++) {
        for (let j = i + 1; j < atomPositions.length; j++) {
            if (atomPositions[i].distanceTo(atomPositions[j]) < 2.0) {
                const path = new THREE.CatmullRomCurve3([atomPositions[i], atomPositions[j]]);
                const geometry = new THREE.TubeGeometry(path, 2, 0.1, 8, false);
                const bond = new THREE.Mesh(geometry, bondMaterial);
                ligand.add(bond);
            }
        }
    }
    ligand.position.set(15, 8, 0);
    ligand.scale.set(1.5, 1.5, 1.5);
    scene.add(ligand);

    // Animation
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      proteinGroup.rotation.x += 0.001;
      proteinGroup.rotation.y += 0.002;

      ligand.rotation.y += 0.005;

      // Docking animation - with a slight arc
      const startPosition = new THREE.Vector3(15, 8, 0);
      const endPosition = new THREE.Vector3(6, 1.5, 2);
      const controlPoint = new THREE.Vector3(10, 10, 5);

      const curve = new THREE.QuadraticBezierCurve3(startPosition, controlPoint, endPosition);

      if (isDocked) {
         ligand.position.lerp(endPosition, 0.03);
         ligand.rotation.y += 0.01;
      } else {
         ligand.position.lerp(startPosition, 0.05);
      }
      
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
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDocked]);

  return <div ref={mountRef} className="h-full w-full" data-ai-hint="3d molecule" />;
}
