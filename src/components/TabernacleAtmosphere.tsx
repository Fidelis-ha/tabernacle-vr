import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Atmospheric effects for the tabernacle interior
// The interior was dark, sacred space lit only by candlelight

export function TabernacleAtmosphere() {
  return (
    <group>
      {/* Holy Place candlelight particles */}
      <Sparkles
        count={50}
        scale={[8, 4, 8]}
        position={[-4.5, 2, -5.25]}
        size={1.5}
        speed={0.3}
        opacity={0.6}
        color="#FFD700"
        noise={0.2}
      />
      
      {/* Holy of Holies divine glow particles */}
      <Sparkles
        count={30}
        scale={[4, 3, 4]}
        position={[0, 2, -11.25]}
        size={1}
        speed={0.2}
        opacity={0.8}
        color="#FFE4B5"
        noise={0.1}
      />
      
      {/* Courtyard altar fire particles */}
      <Sparkles
        count={80}
        scale={[3, 4, 3]}
        position={[0, 3, 7]}
        size={2}
        speed={0.5}
        opacity={0.7}
        color="#FF6600"
        noise={0.3}
      />
      
      {/* Floating dust in light beams */}
      <DustParticles />
    </group>
  );
}

function DustParticles() {
  const particleCount = 300;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const inHolyPlace = Math.random() > 0.4;
      const z = inHolyPlace
        ? -5.25 + (Math.random() - 0.5) * 9
        : (Math.random() - 0.5) * 45;
      const x = inHolyPlace
        ? (Math.random() - 0.5) * 9
        : (Math.random() - 0.5) * 22.5;
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = Math.random() * 4 + 0.5;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, []);
  
  const ref = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Gentle floating motion
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.001;
        positions[i * 3] += Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.0005;
        
        // Wrap around
        if (positions[i * 3 + 1] > 5) positions[i * 3 + 1] = 0.5;
        if (positions[i * 3 + 1] < 0.5) positions[i * 3 + 1] = 5;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color={0xFFE4B5}
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Flickering fire effect for altar
export function FireFlicker({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const baseIntensity = 5;
  
  useFrame((state) => {
    if (lightRef.current) {
      const flicker = Math.sin(state.clock.elapsedTime * 10) * 0.3 +
                      Math.sin(state.clock.elapsedTime * 15.7) * 0.2 +
                      Math.sin(state.clock.elapsedTime * 23.3) * 0.1;
      lightRef.current.intensity = baseIntensity + flicker;
    }
  });
  
  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={baseIntensity}
      color={0xFF6600}
      distance={25}
      decay={2}
      castShadow
    />
  );
}