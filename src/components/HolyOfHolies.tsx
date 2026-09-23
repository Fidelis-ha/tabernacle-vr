import * as THREE from 'three';
import { HOLY_OF_HOLIES_SIZE, HOLY_OF_HOLIES_Z_START, HOLY_OF_HOLIES_Z_CENTER, CUBIT } from './TabernacleFloor';
import { GOLD } from '../utils/materials';

// Holy of Holies dimensions: 10 x 10 cubits (4.5m x 4.5m)
// Position: z = 31.5m to z = 36m
// The Most Sacred place - contains the Ark of the Covenant
// Separated from Holy Place by a veil (Exodus 26:31-33)

const HOLY_SIZE = HOLY_OF_HOLIES_SIZE; // 4.5m
const halfSize = HOLY_SIZE / 2;        // 2.25m
const WALL_HEIGHT = 10 * CUBIT;       // 4.5m
const CURTAIN_HEIGHT = 10 * CUBIT;     // 10 cubits

export function HolyOfHolies() {
  return (
    <group position={[0, 0, HOLY_OF_HOLIES_Z_START]}>
      {/* Floor - dark polished stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, halfSize]} receiveShadow>
        <planeGeometry args={[HOLY_SIZE, HOLY_SIZE]} />
        <meshStandardMaterial color={0x2D2416} roughness={0.6} metalness={0.15} />
      </mesh>
      
      {/* === OUTER CURTAINS - Goat hair === */}
      {/* North wall */}
      <mesh position={[0, CURTAIN_HEIGHT / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[HOLY_SIZE, CURTAIN_HEIGHT]} />
        <meshStandardMaterial color={0x3A3A3A} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* West wall (back) */}
      <mesh position={[-halfSize, CURTAIN_HEIGHT / 2, halfSize]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[HOLY_SIZE, CURTAIN_HEIGHT]} />
        <meshStandardMaterial color={0x3A3A3A} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* East wall */}
      <mesh position={[halfSize, CURTAIN_HEIGHT / 2, halfSize]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[HOLY_SIZE, CURTAIN_HEIGHT]} />
        <meshStandardMaterial color={0x3A3A3A} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* South wall - THE VEIL (blue, purple, scarlet with cherubim) */}
      <mesh position={[0, CURTAIN_HEIGHT / 2, HOLY_SIZE]} rotation={[0, Math.PI, 0]} castShadow>
        <planeGeometry args={[HOLY_SIZE, CURTAIN_HEIGHT]} />
        <meshStandardMaterial color={0x1E3A5F} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Cherubim embroidery on veil */}
      <mesh position={[0, CURTAIN_HEIGHT / 2, HOLY_SIZE - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[HOLY_SIZE * 0.95, CURTAIN_HEIGHT * 0.95]} />
        <meshStandardMaterial 
          color={0xD4AF37} 
          metalness={0.5} 
          roughness={0.3} 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      {/* === GOLDEN GLOW - Shekinah === */}
      <pointLight position={[0, 2.5, halfSize]} intensity={3} color={0xFFD700} distance={8} decay={2} />
      <pointLight position={[0, 1.5, halfSize]} intensity={1.5} color={0xFFAA00} distance={5} decay={2} />
      
      {/* === ARK OF THE COVENANT (Exodus 25:10-22) === */}
      <ArkOfCovenant position={[0, 0, halfSize]} />
    </group>
  );
}

function ArkOfCovenant({ position }: { position: [number, number, number] }) {
  // Exodus 25:10-22 - Ark dimensions: 2.5 x 1.5 x 1.5 cubits
  const length = 2.5 * CUBIT;   // 1.125m
  const width = 1.5 * CUBIT;    // 0.675m
  const height = 1.5 * CUBIT;   // 0.675m
  
  return (
    <group position={[position[0], height / 2 + 0.1, position[2]]}>
      {/* Main ark body - gold overlaid wood */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Gold molding at top */}
      <mesh position={[0, height / 2 + 0.025, 0]}>
        <boxGeometry args={[length + 0.06, 0.05, width + 0.06]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* 4 rings for poles */}
      {[
        [-length/2 - 0.06, 0, 0],
        [length/2 + 0.06, 0, 0]
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.07, 0.02, 6, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      
      {/* Kapporet (mercy seat) - solid gold plate */}
      <mesh position={[0, height / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[length + 0.08, 0.06, width + 0.08]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* 2 Cherubim - facing each other (Exodus 25:18-20) */}
      <Cherub position={[-0.3, height / 2 + 0.35, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Cherub position={[0.3, height / 2 + 0.35, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
}

function Cherub({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Body - hammered gold */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Wings - spread out */}
      <mesh position={[-0.18, 0.08, 0]} rotation={[0, 0, Math.PI / 3]} castShadow>
        <boxGeometry args={[0.22, 0.015, 0.12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
        <boxGeometry args={[0.22, 0.015, 0.12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Face - human likeness */}
      <mesh position={[0, 0.06, 0.1]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.03, 0.08, 0.12]}>
        <sphereGeometry args={[0.012, 4, 4]} />
        <meshStandardMaterial color={0x333333} />
      </mesh>
      <mesh position={[0.03, 0.08, 0.12]}>
        <sphereGeometry args={[0.012, 4, 4]} />
        <meshStandardMaterial color={0x333333} />
      </mesh>
    </group>
  );
}