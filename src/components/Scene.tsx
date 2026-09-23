import { Suspense } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import { TabernacleFloor } from './TabernacleFloor';
import { TabernacleCourtyard } from './TabernacleCourtyard';
import { HolyPlace } from './HolyPlace';
import { HolyOfHolies } from './HolyOfHolies';
import { TabernacleLighting } from './TabernacleLighting';
import { TabernacleAtmosphere } from './TabernacleAtmosphere';

export function Scene() {
  return (
    <group>
      {/* === MUTED DESERT-BLUE SKY (not toybox light blue) === */}
      <mesh position={[0, 30, 20]}>
        <sphereGeometry args={[300, 32, 16]} />
        <meshStandardMaterial color={0x9DB4C4} side={THREE.BackSide} roughness={1} />
      </mesh>

      {/* === WARM DUSTY FOG against the hard diorama horizon === */}
      <fog attach="fog" args={[0xD8C4A0, 60, 260]} />

      {/* === ENVIRONMENT MAP so gold/silver/bronze metals reflect (not black) === */}
      <Suspense fallback={null}>
        <Environment preset="sunset" />
      </Suspense>

      {/* === LIGHTING & ATMOSPHERE (SPEC point 15) === */}
      <TabernacleLighting />
      <TabernacleAtmosphere />

      {/* === COURTYARD === */}
      <TabernacleFloor />
      <TabernacleCourtyard />

      {/* === HOLY PLACE === */}
      <HolyPlace />

      {/* === HOLY OF HOLIES === */}
      <HolyOfHolies />
    </group>
  );
}
