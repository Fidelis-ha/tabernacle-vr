import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ALTAR_Z, HOLY_PLACE_Z_CENTER, HOLY_OF_HOLIES_Z_CENTER, INCENSE_ALTAR_Z } from './TabernacleFloor';

// Atmosphere per SPEC point 15:
// Subtle incense particles in the Holy Place, Shekinah glow particles in the
// Holy of Holies, altar fire sparks in the courtyard, floating dust inside

export function TabernacleAtmosphere() {
  return (
    <group>
      {/* Subtle incense smoke in the Holy Place (around incense altar z = 39.7) */}
      <Sparkles
        count={40}
        scale={[3.5, 3.5, 4]}
        position={[0, 2.2, (HOLY_PLACE_Z_CENTER + INCENSE_ALTAR_Z) / 2 + 0.5]}
        size={1.8}
        speed={0.15}
        opacity={0.25}
        color="#E8DCC8"
        noise={0.4}
      />

      {/* Holy of Holies divine glow particles (z = 42.75) */}
      <Sparkles
        count={30}
        scale={[3.5, 3, 3.5]}
        position={[0, 2.2, HOLY_OF_HOLIES_Z_CENTER]}
        size={1.2}
        speed={0.2}
        opacity={0.7}
        color="#FFE4B5"
        noise={0.1}
      />

      {/* Courtyard altar fire sparks (z = 27) */}
      <Sparkles
        count={70}
        scale={[2.5, 2.5, 2.5]}
        position={[0, 1.6, ALTAR_Z]}
        size={2}
        speed={0.5}
        opacity={0.7}
        color="#FF6600"
        noise={0.3}
      />

      {/* Floating dust inside the tabernacle */}
      <DustParticles />
    </group>
  );
}

function DustParticles() {
  const particleCount = 250;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Inside the tent (z = 31.5 ... 45, x = -2.2 ... 2.2)
      pos[i * 3] = (Math.random() - 0.5) * 4.2;
      pos[i * 3 + 1] = Math.random() * 4 + 0.4;
      pos[i * 3 + 2] = 31.5 + Math.random() * 13.4;
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
        if (positions[i * 3 + 1] > 4.4) positions[i * 3 + 1] = 0.4;
        if (positions[i * 3 + 1] < 0.4) positions[i * 3 + 1] = 4.4;
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
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
