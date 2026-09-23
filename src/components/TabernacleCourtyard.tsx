import * as THREE from 'three';
import { COURTYARD_WIDTH, COURTYARD_LENGTH, CUBIT, COURTYARD_Z_CENTER } from './TabernacleFloor';
import { GOLD, BRONZE, SILVER, ACACIA_WOOD } from '../utils/materials';

// Courtyard dimensions: 50 cubits wide x 50 cubits deep (22.5m x 22.5m)
// Exodus 27:9-19 - 20 pillars on each side, 10 pillars on each end
// Layout: Courtyard z = 0 to z = 22.5, entrance at z = 0 (SOUTH), back at z = 22.5 (NORTH)
// East wall is to the right when entering (positive X), West wall to the left (negative X)

const PILLAR_HEIGHT = 5 * CUBIT; // 5 cubits high = 2.25m
const PILLAR_RADIUS = 0.06;
const CURTAIN_HEIGHT = 5 * CUBIT; // 5 cubits = 2.25m
const GATE_WIDTH = 20 * CUBIT; // 20 cubit gate on entrance (SOUTH)

export function TabernacleCourtyard() {
  const halfWidth = COURTYARD_WIDTH / 2;   // 11.25m
  const halfLength = COURTYARD_LENGTH / 2; // 11.25m
  
  // Gate half-width for entrance gap
  const gateHalfWidth = GATE_WIDTH / 2;    // 4.5m
  
  // South pillars (entrance side at z = 0)
  const southPillars: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -halfWidth + i * (COURTYARD_WIDTH / 10);
    southPillars.push([x, 0, 0]);
  }
  
  // North pillars (back wall at z = 22.5)
  const northPillars: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -halfWidth + i * (COURTYARD_WIDTH / 10);
    northPillars.push([x, 0, COURTYARD_LENGTH]);
  }
  
  // East pillars (right side at x = 11.25) - with gate gap
  const eastPillars: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const z = i * (COURTYARD_LENGTH / 10);
    // Skip center portion for the gate entrance
    if (Math.abs(z - halfLength) < gateHalfWidth) continue;
    eastPillars.push([halfWidth, 0, z]);
  }
  
  // West pillars (left side at x = -11.25)
  const westPillars: [number, number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const z = i * (COURTYARD_LENGTH / 10);
    westPillars.push([-halfWidth, 0, z]);
  }
  
  return (
    <group>
      {/* All pillars */}
      {[...southPillars, ...northPillars, ...eastPillars, ...westPillars].map((pos, i) => (
        <CourtyardPillar key={`pillar-${i}`} position={pos} />
      ))}
      
      {/* === CURTAINS - Blue, purple, scarlet, white (Exodus 27:9-16) === */}
      
      {/* South wall (entrance) - with gate gap */}
      <CurtainMesh
        start={[-halfWidth, 0, 0]}
        end={[-gateHalfWidth, 0, 0]}
        height={CURTAIN_HEIGHT}
        color={0x1E3A5F} // Blue
      />
      <CurtainMesh
        start={[gateHalfWidth, 0, 0]}
        end={[halfWidth, 0, 0]}
        height={CURTAIN_HEIGHT}
        color={0x1E3A5F} // Blue
      />
      
      {/* North wall (back) */}
      <CurtainMesh
        start={[-halfWidth, 0, COURTYARD_LENGTH]}
        end={[halfWidth, 0, COURTYARD_LENGTH]}
        height={CURTAIN_HEIGHT}
        color={0x3A2D5A} // Purple/blue
      />
      
      {/* West wall (left side) */}
      <CurtainMesh
        start={[-halfWidth, 0, 0]}
        end={[-halfWidth, 0, COURTYARD_LENGTH]}
        height={CURTAIN_HEIGHT}
        color={0x8B2942} // Red/scarlet
      />
      
      {/* East wall (right side) - with gate gap */}
      <CurtainMesh
        start={[halfWidth, 0, 0]}
        end={[halfWidth, 0, halfLength - gateHalfWidth]}
        height={CURTAIN_HEIGHT}
        color={0x8B2942} // Red/scarlet
      />
      <CurtainMesh
        start={[halfWidth, 0, halfLength + gateHalfWidth]}
        end={[halfWidth, 0, COURTYARD_LENGTH]}
        height={CURTAIN_HEIGHT}
        color={0x8B2942} // Red/scarlet
      />
      
      {/* === BRONZE ALTAR (Exodus 27:1-8) === */}
      {/* Positioned in the courtyard, 5 cubits from the entrance */}
      <BronzeAltar position={[0, 0, 5]} />
      
      {/* === BRONZE BASIN (Exodus 30:18) === */}
      {/* Positioned between altar and Holy Place entrance */}
      <BronzeBasin position={[0, 0, 18]} />
    </group>
  );
}

function CourtyardPillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bronze base */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.12, 8]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      
      {/* Acacia wood pillar */}
      <mesh position={[0, PILLAR_HEIGHT / 2 + 0.06, 0]} castShadow>
        <cylinderGeometry args={[PILLAR_RADIUS, PILLAR_RADIUS + 0.01, PILLAR_HEIGHT, 8]} />
        <meshStandardMaterial {...ACACIA_WOOD} />
      </mesh>
      
      {/* Silver capital */}
      <mesh position={[0, PILLAR_HEIGHT + 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.12, 8]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>
      
      {/* Gold hook at top */}
      <mesh position={[0, PILLAR_HEIGHT + 0.24, 0]} castShadow>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
    </group>
  );
}

interface CurtainMeshProps {
  start: [number, number, number];
  end: [number, number, number];
  height: number;
  color: number;
}

function CurtainMesh({ start, end, height, color }: CurtainMeshProps) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  
  return (
    <mesh
      position={[midX, height / 2, midZ]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[length - 0.1, height]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

function BronzeAltar({ position }: { position: [number, number, number] }) {
  // Exodus 27:1-8 - 5 cubits square, 3 cubits high
  const altarSize = 5 * CUBIT;    // 2.25m
  const altarHeight = 3 * CUBIT;   // 1.35m
  
  return (
    <group position={position}>
      {/* Hollow altar - bronze overlaid acacia wood */}
      {/* Top border */}
      <mesh position={[0, altarHeight + 0.03, 0]} castShadow>
        <boxGeometry args={[altarSize + 0.15, 0.08, altarSize + 0.15]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      
      {/* Four walls - hollow inside */}
      <mesh position={[0, altarHeight / 2, -altarSize / 2]} castShadow>
        <boxGeometry args={[altarSize + 0.15, altarHeight, 0.1]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[0, altarHeight / 2, altarSize / 2]} castShadow>
        <boxGeometry args={[altarSize + 0.15, altarHeight, 0.1]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[-altarSize / 2, altarHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.1, altarHeight, altarSize]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[altarSize / 2, altarHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.1, altarHeight, altarSize]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      
      {/* Grating inside */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[altarSize - 0.1, 0.1, altarSize - 0.1]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      
      {/* Fire on altar */}
      <mesh position={[0, altarHeight + 0.15, 0]}>
        <boxGeometry args={[altarSize - 0.4, 0.3, altarSize - 0.4]} />
        <meshStandardMaterial
          color={0xFF4400}
          emissive={0xFF2200}
          emissiveIntensity={2.5}
        />
      </mesh>
      
      {/* Fire light */}
      <pointLight position={[0, altarHeight + 0.5, 0]} intensity={2} color={0xFF6600} distance={10} decay={2} />
      
      {/* Rings for poles */}
      {[
        [-altarSize / 2 - 0.1, altarHeight / 2, 0],
        [altarSize / 2 + 0.1, altarHeight / 2, 0],
        [0, altarHeight / 2, -altarSize / 2 - 0.1],
        [0, altarHeight / 2, altarSize / 2 + 0.1],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={pos as [number, number, number]}>
          <torusGeometry args={[0.08, 0.02, 6, 12]} />
          <meshStandardMaterial {...BRONZE} />
        </mesh>
      ))}
    </group>
  );
}

function BronzeBasin({ position }: { position: [number, number, number] }) {
  // Exodus 30:18 - Bronze basin on a stand
  return (
    <group position={position}>
      {/* Stand - acacia wood */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 1.2, 8]} />
        <meshStandardMaterial {...ACACIA_WOOD} />
      </mesh>
      
      {/* Bronze basin */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.6, 0.5, 16]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      
      {/* Water surface */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.85, 0.6, 0.4, 16]} />
        <meshStandardMaterial
          color={0x87CEEB}
          transparent
          opacity={0.6}
          metalness={0.2}
          roughness={0.1}
        />
      </mesh>
      
      {/* Basin rim */}
      <mesh position={[0, 1.68, 0]}>
        <torusGeometry args={[0.88, 0.035, 8, 24]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
    </group>
  );
}