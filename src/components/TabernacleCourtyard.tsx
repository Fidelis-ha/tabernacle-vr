import * as THREE from 'three';
import {
  CUBIT,
  COURTYARD_WIDTH,
  COURTYARD_LENGTH,
  COURTYARD_WALL_HEIGHT,
  GATE_WIDTH,
  ALTAR_Z,
  BASIN_Z,
} from './TabernacleFloor';
import {
  SILVER,
  BRONZE,
  ACACIA_WOOD,
  BYSSUS_WHITE,
  CURTAIN_BLUE,
  CURTAIN_PURPLE,
  CURTAIN_SCARLET,
} from '../utils/materials';

// Courtyard per Exodus 27:9-19 / SPEC:
// 100 cubits (45m) long (z = 0 ... 45) x 50 cubits (22.5m) wide (x = -11.25 ... 11.25)
// Curtain walls 5 cubits (2.25m) high, WHITE twisted byssus (Ex 27:9)
// 60 pillars total: 20 south, 20 north, 10 west, 10 east (incl. gate posts)
// Pillars: bronze sockets, silver-overlaid shafts, silver capitals/hooks (Ex 27:10-11)
// Guy ropes from the pillar tops to bronze pegs in the ground (Ex 27:19; 35:18; 38:20)
// Gate on EAST side (z = 0), 20 cubits wide, colorful blue/purple/scarlet/byssus (Ex 27:16)

const H = COURTYARD_WALL_HEIGHT;   // 2.25m
const HALF_W = COURTYARD_WIDTH / 2; // 11.25m

export function TabernacleCourtyard() {
  // South row (x = -11.25): 20 pillars along z = 0 ... 45
  const southPillars: [number, number, number][] = [];
  for (let i = 0; i < 20; i++) {
    southPillars.push([-HALF_W, 0, (i * COURTYARD_LENGTH) / 19]);
  }

  // North row (x = +11.25): 20 pillars along z = 0 ... 45
  const northPillars: [number, number, number][] = [];
  for (let i = 0; i < 20; i++) {
    northPillars.push([HALF_W, 0, (i * COURTYARD_LENGTH) / 19]);
  }

  // West row (z = 45, back): 10 pillars along x
  const westPillars: [number, number, number][] = [];
  for (let i = 0; i < 10; i++) {
    westPillars.push([-HALF_W + (i * COURTYARD_WIDTH) / 9, 0, COURTYARD_LENGTH]);
  }

  // East row (z = 0, entrance): 6 side pillars + 4 gate pillars = 10
  const eastPillars: [number, number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const x = -HALF_W + (i * COURTYARD_WIDTH) / 9;
    if (Math.abs(x) < GATE_WIDTH / 2) continue; // gate gap
    eastPillars.push([x, 0, 0]);
  }
  const gatePillarXs = [-GATE_WIDTH / 2, -GATE_WIDTH / 6, GATE_WIDTH / 6, GATE_WIDTH / 2];
  gatePillarXs.forEach((x) => eastPillars.push([x, 0, 0]));

  const gateHalf = GATE_WIDTH / 2; // 4.5m

  // Guy ropes + bronze pegs (Ex 27:19; 35:18; 38:20): pegs every ~4.5m along
  // the outer line, rope from the nearest pillar top down to the peg top
  const guyLines: { pillar: [number, number, number]; peg: [number, number, number] }[] = [];
  const pillarStep = COURTYARD_LENGTH / 19;
  // South & north walls (pegs 1m outward, skipping the shared corners)
  for (let i = 1; i < 10; i++) {
    const z = (i * COURTYARD_LENGTH) / 10;
    const pillarZ = Math.round(z / pillarStep) * pillarStep;
    for (const side of [-1, 1]) {
      guyLines.push({
        pillar: [side * HALF_W, H + 0.05, pillarZ],
        peg: [side * (HALF_W + 1), 0.25, z],
      });
    }
  }
  // West wall (back, z = 45 + 1m outward)
  for (let i = 0; i <= 5; i++) {
    const x = -HALF_W + (i * COURTYARD_WIDTH) / 5;
    const pillarX = Math.round((x + HALF_W) / (COURTYARD_WIDTH / 9)) * (COURTYARD_WIDTH / 9) - HALF_W;
    guyLines.push({
      pillar: [pillarX, H + 0.05, COURTYARD_LENGTH],
      peg: [x, 0.25, COURTYARD_LENGTH + 1],
    });
  }
  // East wall (entrance side, z = -1m outward, beside the gate)
  for (const side of [-1, 1]) {
    for (const x of [side * HALF_W, side * (HALF_W - GATE_WIDTH / 2)]) {
      const pillarX = Math.max(-HALF_W, Math.min(HALF_W, Math.round((x + HALF_W) / (COURTYARD_WIDTH / 9)) * (COURTYARD_WIDTH / 9) - HALF_W));
      guyLines.push({ pillar: [pillarX, H + 0.05, 0], peg: [x, 0.25, -1] });
    }
  }

  return (
    <group>
      {/* All 60 pillars */}
      {[...southPillars, ...northPillars, ...westPillars, ...eastPillars].map((pos, i) => (
        <CourtyardPillar key={`pillar-${i}`} position={pos} />
      ))}

      {/* === SIDE CURTAINS - white twisted byssus (Ex 27:9) === */}

      {/* South wall (x = -11.25) */}
      <CurtainMesh
        start={[-HALF_W, 0, 0]}
        end={[-HALF_W, 0, COURTYARD_LENGTH]}
        height={H}
        material={BYSSUS_WHITE}
      />

      {/* North wall (x = +11.25) */}
      <CurtainMesh
        start={[HALF_W, 0, 0]}
        end={[HALF_W, 0, COURTYARD_LENGTH]}
        height={H}
        material={BYSSUS_WHITE}
      />

      {/* West wall (z = 45, back) */}
      <CurtainMesh
        start={[-HALF_W, 0, COURTYARD_LENGTH]}
        end={[HALF_W, 0, COURTYARD_LENGTH]}
        height={H}
        material={BYSSUS_WHITE}
      />

      {/* East wall (z = 0) - two segments beside the gate */}
      <CurtainMesh
        start={[-HALF_W, 0, 0]}
        end={[-gateHalf, 0, 0]}
        height={H}
        material={BYSSUS_WHITE}
      />
      <CurtainMesh
        start={[gateHalf, 0, 0]}
        end={[HALF_W, 0, 0]}
        height={H}
        material={BYSSUS_WHITE}
      />

      {/* === GATE OF THE COURTYARD (Ex 27:16) - colorful work: blue, purple, scarlet, byssus === */}
      {/* Only colorful element of the courtyard fence; same height as the fence (2.25m) */}
      {[
        CURTAIN_BLUE,
        CURTAIN_PURPLE,
        CURTAIN_SCARLET,
        BYSSUS_WHITE,
      ].map((mat, i) => (
        <mesh
          key={`gate-stripe-${i}`}
          position={[-gateHalf + (gateHalf / 2) * (i + 0.5) + 0, H / 2, 0]}
          castShadow
        >
          <planeGeometry args={[gateHalf / 2, H]} />
          <meshStandardMaterial
            color={mat.color}
            roughness={mat.roughness}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* === GUY ROPES + BRONZE PEGS (Ex 27:19; 35:18; 38:20) === */}
      {/* Pegs driven into the ground along the outer line of the courtyard,
          ropes from the pillar tops slanting outward down to the pegs */}
      {guyLines.map((g, i) => (
        <group key={`guy-${i}`}>
          <Rope start={g.pillar} end={g.peg} />
          <BronzePeg position={g.peg} />
        </group>
      ))}

      {/* === BRONZE ALTAR (Ex 27:1-8; 38:1-7) - z = 27, midline === */}
      <BronzeAltar position={[0, 0, ALTAR_Z]} />

      {/* === BRONZE BASIN (Ex 30:18; 40:7) - between altar and tabernacle, z = 29.5 === */}
      <BronzeBasin position={[0, 0, BASIN_Z]} />
    </group>
  );
}

function Rope({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  // Thin guy rope (cylinder oriented from start to end), color 0xD8CBB0
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = e.clone().sub(s);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  const mid = s.clone().add(e).multiplyScalar(0.5);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.008, 0.008, length, 5]} />
      <meshStandardMaterial color={0xD8CBB0} roughness={0.9} />
    </mesh>
  );
}

function BronzePeg({ position }: { position: [number, number, number] }) {
  // Small bronze tent peg driven into the ground (Ex 27:19; 38:20)
  return (
    <mesh position={[position[0], 0.125, position[2]]}>
      <cylinderGeometry args={[0.022, 0.014, 0.25, 6]} />
      <meshStandardMaterial {...BRONZE} />
    </mesh>
  );
}

function CourtyardPillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bronze socket (Ex 27:10 "sockets of bronze") */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.14, 10]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>

      {/* Silver foot on top of the socket (Ex 27:10-11) */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 10]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>

      {/* Silver-overlaid shaft */}
      <mesh position={[0, H / 2 + 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, H, 10]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>

      {/* Silver capital with band */}
      <mesh position={[0, H + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.05, 0.12, 10]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>

      {/* Silver hook (Ex 27:10-11) */}
      <mesh position={[0, H + 0.22, 0]} castShadow>
        <torusGeometry args={[0.035, 0.012, 6, 12, Math.PI * 1.5]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>
    </group>
  );
}

interface CurtainMeshProps {
  start: [number, number, number];
  end: [number, number, number];
  height: number;
  material: { color: number; roughness: number };
}

function CurtainMesh({ start, end, height, material }: CurtainMeshProps) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  return (
    <mesh
      position={[midX, height / 2 + 0.02, midZ]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[length - 0.1, height]} />
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function BronzeAltar({ position }: { position: [number, number, number] }) {
  // Exodus 27:1-8 - 5 x 5 cubits, 3 cubits high, acacia overlaid with bronze, hollow
  const size = 5 * CUBIT;    // 2.25m
  const height = 3 * CUBIT;  // 1.35m
  const wallT = 0.1;

  return (
    <group position={position}>
      {/* Top border / ledge - rim frame of 4 narrow boxes so the grating
          and the fire stay visible (Ex 27:5 "wegen des Rostes") */}
      <mesh position={[0, height + 0.03, -(size + 0.15) / 2 + 0.075]} castShadow>
        <boxGeometry args={[size + 0.15, 0.08, 0.15]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[0, height + 0.03, (size + 0.15) / 2 - 0.075]} castShadow>
        <boxGeometry args={[size + 0.15, 0.08, 0.15]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[-(size + 0.15) / 2 + 0.075, height + 0.03, 0]} castShadow>
        <boxGeometry args={[0.15, 0.08, size - 0.15]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[(size + 0.15) / 2 - 0.075, height + 0.03, 0]} castShadow>
        <boxGeometry args={[0.15, 0.08, size - 0.15]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>

      {/* Four walls - hollow inside */}
      <mesh position={[0, height / 2, -size / 2]} castShadow>
        <boxGeometry args={[size + 0.15, height, wallT]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[0, height / 2, size / 2]} castShadow>
        <boxGeometry args={[size + 0.15, height, wallT]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[-size / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[wallT, height, size]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[size / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[wallT, height, size]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>

      {/* Grating / network of bronze, mounted midway inside (Ex 27:4-5) */}
      <mesh position={[0, height * 0.5, 0]} castShadow>
        <boxGeometry args={[size - wallT, 0.05, size - wallT]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      {/* Grating bars */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((z, i) => (
        <mesh key={`grate-${i}`} position={[0, height * 0.5 + 0.04, z]}>
          <boxGeometry args={[size - wallT, 0.03, 0.03]} />
          <meshStandardMaterial {...BRONZE} />
        </mesh>
      ))}

      {/* Four HORNs at the four corners (Ex 27:2) */}
      {[
        [-size / 2, height, -size / 2],
        [size / 2, height, -size / 2],
        [-size / 2, height, size / 2],
        [size / 2, height, size / 2],
      ].map((pos, i) => (
        <mesh key={`horn-${i}`} position={pos as [number, number, number]} castShadow>
          <coneGeometry args={[0.09, 0.3, 8]} />
          <meshStandardMaterial {...BRONZE} />
        </mesh>
      ))}

      {/* Fire on the grating - 2-3 overlapping cones instead of a solid block */}
      <mesh position={[0, height * 0.5 + 0.35, 0]}>
        <coneGeometry args={[0.45, 0.85, 8]} />
        <meshStandardMaterial
          color={0xFF6600}
          emissive={0xFF3300}
          emissiveIntensity={2.5}
        />
      </mesh>
      <mesh position={[0.18, height * 0.5 + 0.22, 0.1]} rotation={[0.12, 0, -0.15]}>
        <coneGeometry args={[0.3, 0.55, 8]} />
        <meshStandardMaterial
          color={0xFF8833}
          emissive={0xFF5500}
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[-0.15, height * 0.5 + 0.18, -0.12]} rotation={[-0.1, 0, 0.18]}>
        <coneGeometry args={[0.26, 0.45, 8]} />
        <meshStandardMaterial
          color={0xFFAA44}
          emissive={0xFF7700}
          emissiveIntensity={3.5}
        />
      </mesh>

      {/* Fire light */}
      <pointLight position={[0, height + 0.4, 0]} intensity={2} color={0xFF6600} distance={12} decay={2} />

      {/* Rings at the four LOWER corners (Ex 27:4 - "in den vier Ecken ... unten") */}
      {[
        [-size / 2 + 0.05, 0.25, -size / 2 + 0.05],
        [size / 2 - 0.05, 0.25, -size / 2 + 0.05],
        [-size / 2 + 0.05, 0.25, size / 2 - 0.05],
        [size / 2 - 0.05, 0.25, size / 2 - 0.05],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.07, 0.02, 6, 12]} />
          <meshStandardMaterial {...BRONZE} />
        </mesh>
      ))}

      {/* Carrying poles - acacia wood overlaid with bronze (Ex 27:6-7), resting in the rings */}
      {[-size / 2 + 0.05, size / 2 - 0.05].map((z, i) => (
        <mesh key={`pole-${i}`} position={[0, 0.25, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, size + 1.2, 8]} />
          <meshStandardMaterial {...ACACIA_WOOD} />
        </mesh>
      ))}
    </group>
  );
}

function BronzeBasin({ position }: { position: [number, number, number] }) {
  // Exodus 30:18 - bronze basin with bronze stand
  return (
    <group position={position}>
      {/* Bronze stand */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 1.0, 10]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>

      {/* Bronze basin */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.5, 0.5, 16]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>

      {/* Water surface - dark greenish-brown, reflecting bronze and sky */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.74, 0.6, 0.12, 16]} />
        <meshStandardMaterial
          color={0x3E5C52}
          transparent
          opacity={0.75}
          metalness={0.3}
          roughness={0.05}
        />
      </mesh>

      {/* Basin rim */}
      <mesh position={[0, 1.51, 0]}>
        <torusGeometry args={[0.79, 0.035, 8, 24]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
    </group>
  );
}
