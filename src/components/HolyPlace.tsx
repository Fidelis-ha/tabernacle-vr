import * as THREE from 'three';
import { HOLY_PLACE_SIZE, HOLY_PLACE_Z_START, HOLY_PLACE_Z_CENTER, CUBIT } from './TabernacleFloor';
import { GOLD, ACACIA_WOOD } from '../utils/materials';

// Holy Place dimensions: 20 x 20 cubits (9m x 9m)
// Position: z = 22.5m to z = 31.5m (9m deep)
// Contains: Golden Lampstand (Menorah), Table of Showbread, Golden Incense Altar

const HALF_PLACE = HOLY_PLACE_SIZE / 2; // 4.5m
const WALL_HEIGHT = 10 * CUBIT; // 4.5m tall walls
const CURTAIN_HEIGHT = 10 * CUBIT; // 10 cubits for outer curtains

export function HolyPlace() {
  return (
    <group position={[0, 0, HOLY_PLACE_Z_START]}>
      {/* Floor - white linen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, HALF_PLACE]} receiveShadow>
        <planeGeometry args={[HOLY_PLACE_SIZE, HOLY_PLACE_SIZE]} />
        <meshStandardMaterial color={0xF5F5DC} roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* === OUTER CURTAINS - Goat hair (Exodus 26:7-13) === */}
      {/* North wall */}
      <CurtainPanel 
        width={HOLY_PLACE_SIZE + 0.2} 
        height={CURTAIN_HEIGHT} 
        position={[0, CURTAIN_HEIGHT / 2, 0]}
        color={0x4A4A4A}
      />
      
      {/* West wall (back) */}
      <CurtainPanel 
        width={HOLY_PLACE_SIZE + 0.2} 
        height={CURTAIN_HEIGHT} 
        position={[-HALF_PLACE, CURTAIN_HEIGHT / 2, HALF_PLACE]}
        rotation={[0, Math.PI / 2, 0]}
        color={0x4A4A4A}
      />
      
      {/* East wall */}
      <CurtainPanel 
        width={HOLY_PLACE_SIZE + 0.2} 
        height={CURTAIN_HEIGHT} 
        position={[HALF_PLACE, CURTAIN_HEIGHT / 2, HALF_PLACE]}
        rotation={[0, -Math.PI / 2, 0]}
        color={0x4A4A4A}
      />
      
      {/* South wall (entrance) - entrance gap */}
      <CurtainPanel 
        width={HALF_PLACE - 0.5} 
        height={CURTAIN_HEIGHT} 
        position={[-HALF_PLACE / 2 - 0.25, CURTAIN_HEIGHT / 2, HOLY_PLACE_SIZE]}
        color={0x4A4A4A}
      />
      <CurtainPanel 
        width={HALF_PLACE - 0.5} 
        height={CURTAIN_HEIGHT} 
        position={[HALF_PLACE / 2 + 0.25, CURTAIN_HEIGHT / 2, HOLY_PLACE_SIZE]}
        color={0x4A4A4A}
      />
      
      {/* === INNER CURTAINS - Blue, purple, scarlet (Exodus 26:31-36) === */}
      {/* West wall inner */}
      <CurtainPanel 
        width={HOLY_PLACE_SIZE} 
        height={WALL_HEIGHT} 
        position={[-HALF_PLACE - 0.05, WALL_HEIGHT / 2, HALF_PLACE]}
        rotation={[0, Math.PI / 2, 0]}
        color={0x1E3A5F}
        opacity={0.6}
      />
      
      {/* === ENTRANCE PILLARS - 5 golden pillars (Exodus 26:36-37) === */}
      <EntrancePillars />
      
      {/* === MENORAH - Golden Lampstand (Exodus 25:31-40) === */}
      <Menora position={[-HALF_PLACE + 1.8, 0, 2]} />
      
      {/* === TABLE OF SHOWBREAD (Exodus 25:23-30) === */}
      <ShowbreadTable position={[HALF_PLACE - 1.8, 0, 2]} />
      
      {/* === GOLDEN INCENSE ALTAR (Exodus 30:1-10) === */}
      <IncenseAltar position={[0, 0, HOLY_PLACE_SIZE - 2]} />
    </group>
  );
}

function CurtainPanel({ width, height, position, rotation = [0, 0, 0], color, opacity = 0.9 }: CurtainPanelProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={opacity} 
        side={THREE.DoubleSide}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

interface CurtainPanelProps {
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  color: number;
  opacity?: number;
}

function EntrancePillars() {
  // East entrance: 5 pillars with curtain
  const pillarPositions = [-HALF_PLACE + 1.5, -HALF_PLACE / 2, 0, HALF_PLACE / 2, HALF_PLACE - 1.5];
  
  return (
    <group position={[0, 0, HOLY_PLACE_SIZE]}>
      {pillarPositions.map((x, i) => (
        <group key={`pillar-${i}`} position={[x, 0, 0]}>
          {/* Pillar base */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.15, 8]} />
            <meshStandardMaterial color={0xCD7F32} metalness={0.8} roughness={0.3} />
          </mesh>
          
          {/* Pillar shaft */}
          <mesh position={[0, WALL_HEIGHT / 2 + 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, WALL_HEIGHT, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          
          {/* Capital */}
          <mesh position={[0, WALL_HEIGHT + 0.15, 0]}>
            <cylinderGeometry args={[0.06, 0.04, 0.12, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        </group>
      ))}
      
      {/* Entrance curtain */}
      <mesh position={[0, WALL_HEIGHT / 2, 0.02]} castShadow>
        <planeGeometry args={[HOLY_PLACE_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial color={0x1E3A5F} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Decorative overlay - purple/scarlet */}
      <mesh position={[0, WALL_HEIGHT / 2, 0.04]} castShadow>
        <planeGeometry args={[HOLY_PLACE_SIZE * 0.9, WALL_HEIGHT * 0.85]} />
        <meshStandardMaterial color={0x5A2D82} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Menora({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.15, 12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Central stem */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 3.4, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* 6 branches - 3 on each side */}
      {[-0.55, 0, 0.55].map((xOff, i) => (
        <group key={`branch-${i}`}>
          {/* Left branch */}
          <mesh position={[xOff - 0.45, 1.55 - i * 0.55, 0]} rotation={[0, 0, Math.PI / 5]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 1.4, 6]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          {/* Right branch */}
          <mesh position={[xOff + 0.45, 1.55 - i * 0.55, 0]} rotation={[0, 0, -Math.PI / 5]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 1.4, 6]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        </group>
      ))}
      
      {/* 7 lamps (bowls) with flames */}
      {[
        [0, 3.3, 0],
        [-0.45, 2.8, 0], [0.45, 2.8, 0],
        [-0.65, 2.25, 0], [0.65, 2.25, 0],
        [-0.85, 1.7, 0], [0.85, 1.7, 0]
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos as [number, number, number]}>
          {/* Lamp bowl */}
          <mesh>
            <cylinderGeometry args={[0.06, 0.04, 0.08, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          {/* Flame */}
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.025, 0.08, 6]} />
            <meshStandardMaterial 
              color={0xFFDD44}
              emissive={0xFFAA00}
              emissiveIntensity={4}
            />
          </mesh>
        </group>
      ))}
      
      {/* Menora light */}
      <pointLight position={[0, 2.5, 0]} intensity={2.5} color={0xFFD700} distance={12} decay={2} />
    </group>
  );
}

function ShowbreadTable({ position }: { position: [number, number, number] }) {
  const tableWidth = 2 * CUBIT;      // 0.9m
  const tableDepth = 1.5 * CUBIT;    // 0.675m
  const tableHeight = 2.5 * CUBIT;  // 1.125m
  
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, tableHeight, 0]} castShadow>
        <boxGeometry args={[tableWidth, 0.07, tableDepth]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Border frames */}
      <mesh position={[0, tableHeight + 0.045, tableDepth / 2 + 0.03]}>
        <boxGeometry args={[tableWidth, 0.045, 0.045]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, tableHeight + 0.045, -tableDepth / 2 - 0.03]}>
        <boxGeometry args={[tableWidth, 0.045, 0.045]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[tableWidth / 2 + 0.03, tableHeight + 0.045, 0]}>
        <boxGeometry args={[0.045, 0.045, tableDepth]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[-tableWidth / 2 - 0.03, tableHeight + 0.045, 0]}>
        <boxGeometry args={[0.045, 0.045, tableDepth]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* 4 Legs with rings */}
      {[
        [-tableWidth/2 + 0.08, tableHeight/2, tableDepth/2 - 0.08],
        [tableWidth/2 - 0.08, tableHeight/2, tableDepth/2 - 0.08],
        [-tableWidth/2 + 0.08, tableHeight/2, -tableDepth/2 + 0.08],
        [tableWidth/2 - 0.08, tableHeight/2, -tableDepth/2 + 0.08]
      ].map((pos, i) => (
        <group key={`leg-${i}`} position={pos as [number, number, number]}>
          <mesh castShadow>
            <boxGeometry args={[0.07, tableHeight, 0.07]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        </group>
      ))}
      
      {/* 12 loaves - 2 rows of 6 */}
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        return (
          <mesh key={`bread-${i}`} position={[-0.45 + col * 0.15, tableHeight + 0.12, -0.08 + row * 0.16]} castShadow>
            <boxGeometry args={[0.11, 0.055, 0.14]} />
            <meshStandardMaterial color={0xD4A574} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

function IncenseAltar({ position }: { position: [number, number, number] }) {
  const altarSize = 1 * CUBIT;    // 0.45m
  const altarHeight = 2 * CUBIT;  // 0.9m
  
  return (
    <group position={position}>
      {/* Main altar body - gold overlaid */}
      <mesh position={[0, altarHeight / 2, 0]} castShadow>
        <boxGeometry args={[altarSize, altarHeight, altarSize]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Gold border at top */}
      <mesh position={[0, altarHeight + 0.025, 0]}>
        <boxGeometry args={[altarSize + 0.06, 0.05, altarSize + 0.06]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Four horns at top corners */}
      {[
        [-altarSize/2, altarHeight, -altarSize/2],
        [altarSize/2, altarHeight, -altarSize/2],
        [-altarSize/2, altarHeight, altarSize/2],
        [altarSize/2, altarHeight, altarSize/2]
      ].map((pos, i) => (
        <mesh key={`horn-${i}`} position={pos as [number, number, number]} castShadow>
          <coneGeometry args={[0.045, 0.18, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      
      {/* Ring at bottom for poles */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.025, 6, 12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      
      {/* Incense smoke */}
      <mesh position={[0, altarHeight + 0.35, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={0xFFFFFF} transparent opacity={0.08} />
      </mesh>
      
      {/* Incense light */}
      <pointLight position={[0, altarHeight + 0.2, 0]} intensity={0.5} color={0xFFD700} distance={4} decay={2} />
    </group>
  );
}