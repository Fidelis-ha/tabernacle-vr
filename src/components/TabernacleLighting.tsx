import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ALTAR_Z, HOLY_OF_HOLIES_Z_CENTER, MENORA_X } from './TabernacleFloor';

// Lighting per SPEC point 15:
// Outside: warm desert sunlight with hard shadows, muted desert-blue sky handled in Scene
// Inside: only the Menorah (warm, flickering) + Shekinah glory in the Holy of Holies,
// ember glow of the incense altar, altar fire in the courtyard

export function TabernacleLighting() {
  return (
    <group>
      {/* Warm desert sunlight with hard shadows */}
      <ambientLight intensity={0.35} color={0xFFF3E0} />
      <directionalLight
        position={[30, 45, -25]}
        intensity={2.2}
        color={0xFFE8C8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      {/* Soft sky fill */}
      <directionalLight
        position={[-15, 25, 40]}
        intensity={0.5}
        color={0xC9D8E8}
      />

      {/* Altar fire in the courtyard (z = 27) */}
      <FlickerLight position={[0, 1.9, ALTAR_Z]} baseIntensity={2.5} color={0xFF6600} distance={14} />

      {/* Menorah light in the Holy Place - warm, flickering (x = -1.1, z = 36) */}
      <FlickerLight position={[MENORA_X, 1.4, 36]} baseIntensity={1.8} color={0xFFB84D} distance={10} />

      {/* Shekinah glory in the Holy of Holies (z = 42.75) */}
      <pointLight position={[0, 2.6, HOLY_OF_HOLIES_Z_CENTER]} intensity={3} color={0xFFD700} distance={9} decay={2} />
      <pointLight position={[0, 1.6, HOLY_OF_HOLIES_Z_CENTER]} intensity={1.4} color={0xFFE4B5} distance={6} decay={2} />
    </group>
  );
}

function FlickerLight({
  position,
  baseIntensity,
  color,
  distance,
}: {
  position: [number, number, number];
  baseIntensity: number;
  color: number;
  distance: number;
}) {
  const ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      const flicker =
        Math.sin(t * 9.7) * 0.12 +
        Math.sin(t * 15.3) * 0.08 +
        Math.sin(t * 23.1) * 0.05;
      ref.current.intensity = baseIntensity * (1 + flicker);
    }
  });

  return (
    <pointLight
      ref={ref}
      position={position}
      intensity={baseIntensity}
      color={color}
      distance={distance}
      decay={2}
    />
  );
}
