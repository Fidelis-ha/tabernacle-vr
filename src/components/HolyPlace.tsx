import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import {
  CUBIT,
  TENT_WIDTH,
  TENT_HEIGHT,
  TENT_Z_START,
  HOLY_PLACE_Z_START,
  MENORA_X,
  TABLE_X,
  FURNITURE_Z,
  INCENSE_ALTAR_Z,
} from './TabernacleFloor';
import {
  GOLD,
  SILVER,
  BRONZE,
  ACACIA_WOOD,
  GOAT_HAIR,
  RAM_SKIN,
  TACHASH,
  CURTAIN_BLUE,
  CURTAIN_PURPLE,
  CURTAIN_SCARLET,
} from '../utils/materials';

// Holy Place per Exodus 26:15-37 / SPEC:
// Tabernacle tent: 30 cubits long (13.5m, z = 31.5 ... 45), 10 cubits wide (4.5m), 10 cubits high (4.5m)
// Walls = acacia boards overlaid with gold (NOT fabric), on silver sockets, held by 5 gold bars per side
// Roof: 4 layers (byssus/cherubim, goat hair, ram skins red, tachash) with 1-cubit front overhang
// Furniture: Menorah (~1 cubit high) south, Showbread table (1.5 cubits high) north,
// Incense altar directly before the veil (z = 39.7)

const PLANK_W = 1.5 * CUBIT;   // 0.675m board width
const PLANK_T = 0.12;          // board thickness
const HALF_W = TENT_WIDTH / 2; // 2.25m
// Holy Place boards end where the Holy of Holies boards begin (z = 40.275, 13 boards of 20 per side)
export const HOLY_WALL_SPLIT_Z = HOLY_PLACE_Z_START + 13 * PLANK_W;

export function HolyPlace() {
  return (
    <group>
      {/* === GOLD-OVERLAID ACACIA BOARD WALLS - south & north (Holy section) === */}
      <SideBeamWall x={-HALF_W} zStart={HOLY_PLACE_Z_START} zEnd={HOLY_WALL_SPLIT_Z} />
      <SideBeamWall x={HALF_W} zStart={HOLY_PLACE_Z_START} zEnd={HOLY_WALL_SPLIT_Z} />

      {/* === 4 ROOF LAYERS (Ex 26:1-14) over the whole tent === */}
      <RoofLayers />

      {/* === ENTRANCE SCREEN - 5 acacia/gold pillars, colorful curtain (Ex 26:36-37) === */}
      <EntranceScreen />

      {/* === MENORAH (Ex 25:31-40) - south side, ~1 cubit high === */}
      <Menora position={[MENORA_X, 0, FURNITURE_Z]} />

      {/* === TABLE OF SHOWBREAD (Ex 25:23-30) - north side, 1.5 cubits high === */}
      <ShowbreadTable position={[TABLE_X, 0, FURNITURE_Z]} />

      {/* === GOLDEN INCENSE ALTAR (Ex 30:1-10) - directly before the veil === */}
      <IncenseAltar position={[0, 0, INCENSE_ALTAR_Z]} />
    </group>
  );
}

interface SideBeamWallProps {
  x: number;
  zStart: number;
  zEnd: number;
}

// A wall of gold-overlaid boards standing along the z axis, with silver
// sockets and 5 gold-covered bars running through gold rings (Ex 26:15-29).
// Exported for reuse by HolyOfHolies.
export function SideBeamWall({ x, zStart, zEnd }: SideBeamWallProps) {
  const length = zEnd - zStart;
  const count = Math.round(length / PLANK_W);
  const spacing = length / count;
  const plankLen = spacing * 0.93; // small gap -> golden stripe silhouette
  const barYs = [0.55, 1.4, TENT_HEIGHT / 2, 3.1, 3.95];
  const ringPlanks = [2, Math.floor(count / 2), count - 3];

  return (
    <group>
      {/* Boards with silver sockets (Ex 26:19, one talent of silver each) */}
      {Array.from({ length: count }).map((_, i) => {
        const z = zStart + spacing * (i + 0.5);
        return (
          <group key={`plank-${i}`}>
            <mesh position={[x, TENT_HEIGHT / 2 + 0.2, z]} castShadow receiveShadow>
              <boxGeometry args={[PLANK_T, TENT_HEIGHT - 0.2, plankLen]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
            {/* Silver socket under each board */}
            <mesh position={[x, 0.1, z]} castShadow>
              <boxGeometry args={[0.28, 0.2, Math.min(0.36, plankLen + 0.06)]} />
              <meshStandardMaterial {...SILVER} />
            </mesh>
          </group>
        );
      })}

      {/* 5 horizontal bars, gold overlaid (Ex 26:26-28) */}
      {barYs.map((y, bi) => (
        <mesh key={`bar-${bi}`} position={[x, y, (zStart + zEnd) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, length, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* Gold rings holding the bars */}
      {barYs.map((y, bi) =>
        ringPlanks.map((pi, ri) => {
          const z = zStart + spacing * (pi + 0.5);
          return (
            <mesh key={`ring-${bi}-${ri}`} position={[x, y, z]}>
              <torusGeometry args={[0.052, 0.012, 6, 12]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

function RoofLayers() {
  // 4 layers from inside to outside (Ex 26:1-14):
  // a) 10 byssus curtains, blue/purple/scarlet with cherubim embroidery
  // b) 11 goat hair curtains
  // c) ram skins dyed red
  // d) tachash skins (dark)
  // 1-cubit overhang at the front (east, z = 31.5), half curtain hanging at the back (Ex 26:9,12-13)
  const frontOverhang = CUBIT; // 0.45m beyond the front wall
  const layers = [
    { w: 4.9, t: 0.03, back: 45.3, y: 4.515, mat: { color: 0x45459C, roughness: 0.75 } },   // byssus w/ cherubim (blue/violet)
    { w: 5.35, t: 0.04, back: 45.6, y: 4.56, mat: GOAT_HAIR },                              // goat hair
    { w: 5.8, t: 0.04, back: 45.9, y: 4.61, mat: RAM_SKIN },                                // ram skins red
    { w: 6.25, t: 0.05, back: 46.2, y: 4.66, mat: TACHASH },                                // tachash dark
  ];

  return (
    <group>
      {layers.map((l, i) => {
        const front = TENT_Z_START - frontOverhang - i * 0.05;
        const len = l.back - front;
        const zCenter = (front + l.back) / 2;
        return (
          <group key={`roof-${i}`}>
            <mesh position={[0, l.y, zCenter]} castShadow>
              <boxGeometry args={[l.w, l.t, len]} />
              <meshStandardMaterial
                color={l.mat.color}
                roughness={l.mat.roughness}
                {...('transparent' in l.mat ? { transparent: true, opacity: (l.mat as typeof GOAT_HAIR).opacity } : {})}
              />
            </mesh>
            {/* Back of the curtain hangs down (half curtain) */}
            <mesh position={[0, 3.35, l.back - 0.02]}>
              <planeGeometry args={[l.w, 2.3]} />
              <meshStandardMaterial
                color={l.mat.color}
                roughness={l.mat.roughness}
                side={THREE.DoubleSide}
                {...('transparent' in l.mat ? { transparent: true, opacity: (l.mat as typeof GOAT_HAIR).opacity } : {})}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function EntranceScreen() {
  // 5 pillars of acacia overlaid with gold, bronze sockets (Ex 26:37)
  const xs = [-1.8, -0.9, 0, 0.9, 1.8];
  const screenH = TENT_HEIGHT - 0.15;
  const colors = [CURTAIN_BLUE, CURTAIN_PURPLE, CURTAIN_SCARLET, { color: 0xF5EFE0 }, CURTAIN_BLUE];

  return (
    <group position={[0, 0, HOLY_PLACE_Z_START]}>
      {xs.map((x, i) => (
        <group key={`pillar-${i}`} position={[x, 0, 0]}>
          <mesh position={[0, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.13, 0.14, 8]} />
            <meshStandardMaterial {...BRONZE} />
          </mesh>
          <mesh position={[0, TENT_HEIGHT / 2 + 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, TENT_HEIGHT, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <mesh position={[0, TENT_HEIGHT + 0.13, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.045, 0.1, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        </group>
      ))}

      {/* Colorful entrance screen: blue, purple, scarlet, byssus (Ex 26:36)
          5 stripes of 0.9m width, centers -2.25 + 0.9*(i+0.5) -> covers the
          full 4.5m front symmetrically */}
      {colors.map((c, i) => (
        <mesh key={`screen-${i}`} position={[-2.25 + 0.9 * (i + 0.5), screenH / 2 + 0.1, 0.03]}>
          <planeGeometry args={[0.9, screenH]} />
          <meshStandardMaterial color={c.color} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Renders a golden curved branch along a CatmullRomCurve3 (almond-shaped
// sweep of the menorah arms, Ex 25:31-36)
function CurvedBranch({
  points,
}: {
  points: [number, number, number][];
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    );
    return new THREE.TubeGeometry(curve, 24, 0.016, 8, false);
  }, [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial {...GOLD} />
    </mesh>
  );
}

function Menora({ position }: { position: [number, number, number] }) {
  // Exodus 25:31-40 - one talent of gold, ~1 cubit (≈1m) high
  // 7 arms (3 pairs + central shaft), almond blossom knops, oil lamps with flames
  const baseY = 0.12;
  const stemTop = 0.95;
  const lampY = 0.98;
  const pairs: Array<{ lampX: number; elbowY: number }> = [
    { lampX: 0.11, elbowY: 0.42 },
    { lampX: 0.21, elbowY: 0.58 },
    { lampX: 0.31, elbowY: 0.74 },
  ];

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, baseY / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, baseY, 12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Central shaft */}
      <mesh position={[0, baseY + (stemTop - baseY) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, stemTop - baseY, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Almond blossom knops on the shaft */}
      {[0.3, 0.55, 0.8].map((y, i) => (
        <mesh key={`knop-${i}`} position={[0, y, 0]} castShadow>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* 3 pairs of curved branches (CatmullRom sweeps) */}
      {pairs.map((p, i) =>
        [-1, 1].map((side) => {
          const midY = p.elbowY + (lampY - p.elbowY) * 0.45;
          const midX = side * p.lampX * 0.75;
          return (
            <group key={`branch-${i}-${side}`}>
              <CurvedBranch
                points={[
                  [side * 0.02, p.elbowY, 0],
                  [side * p.lampX * 0.4, p.elbowY + (midY - p.elbowY) * 0.5, 0],
                  [midX, midY, 0],
                  [side * p.lampX, lampY, 0],
                ]}
              />
              {/* Blossom knop on the sweep */}
              <mesh position={[side * p.lampX * 0.55, (p.elbowY + midY) / 2, 0]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial {...GOLD} />
              </mesh>
            </group>
          );
        })
      )}

      {/* 7 lamps (bowls) with flames */}
      {[0, ...pairs.map((p) => p.lampX * -1), ...pairs.map((p) => p.lampX)].map((x, i) => (
        <group key={`lamp-${i}`} position={[x, lampY, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.028, 0.06, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <coneGeometry args={[0.018, 0.06, 6]} />
            <meshStandardMaterial color={0xFFDD44} emissive={0xFFAA00} emissiveIntensity={4} />
          </mesh>
        </group>
      ))}
      {/* Flickering lampstand light lives in TabernacleLighting (no duplicate light here) */}
    </group>
  );
}

function ShowbreadTable({ position }: { position: [number, number, number] }) {
  // Exodus 25:23-30 - 2 x 1 x 1.5 cubits (0.9 x 0.45 x 0.675m), acacia overlaid with gold
  const w = 2 * CUBIT;   // 0.9m
  const d = 1 * CUBIT;   // 0.45m
  const h = 1.5 * CUBIT; // 0.675m - NOT 2.5 cubits!
  const topY = h;

  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, topY - 0.025, 0]} castShadow>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Golden double crown (two rims) */}
      <mesh position={[0, topY + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[d / 2 - 0.01, 0.012, 6, 20]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, topY + 0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[d / 2 - 0.01, 0.012, 6, 20]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* 4 legs */}
      {[
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={[pos[0], h / 2 - 0.05, pos[1]]} castShadow>
          <boxGeometry args={[0.06, h - 0.1, 0.06]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* 4 gold rings at the corners + carrying staves (Ex 25:26-28) */}
      {[
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={[pos[0], h - 0.12, pos[1]]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.035, 0.01, 6, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      {[-d / 2 + 0.06, d / 2 - 0.06].map((z, i) => (
        <mesh key={`stave-${i}`} position={[0, h - 0.12, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, w + 0.5, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* Showbread: 2 stacks of 6 loaves each (Ex 25:30 / Lev 24:5-9) */}
      {[-0.2, 0.2].map((stackX, s) =>
        Array.from({ length: 6 }).map((_, j) => (
          <mesh
            key={`bread-${s}-${j}`}
            position={[stackX, topY + 0.045 + j * 0.042, 0]}
            rotation={[0, j % 2 === 0 ? 0.12 : -0.12, 0]}
            castShadow
          >
            <boxGeometry args={[0.17, 0.038, 0.13]} />
            <meshStandardMaterial color={0xD4A574} roughness={0.85} />
          </mesh>
        ))
      )}

      {/* Gold vessels: dishes, spoons, bowls (Ex 25:29) */}
      <mesh position={[-w / 2 + 0.09, topY + 0.035, d / 4]} castShadow>
        <cylinderGeometry args={[0.035, 0.025, 0.06, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[-w / 2 + 0.09, topY + 0.035, -d / 4]} castShadow>
        <cylinderGeometry args={[0.03, 0.02, 0.05, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[w / 2 - 0.09, topY + 0.06, 0]} castShadow>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[w / 2 - 0.09, topY + 0.12, 0]}>
        <cylinderGeometry args={[0.014, 0.02, 0.06, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
    </group>
  );
}

function IncenseAltar({ position }: { position: [number, number, number] }) {
  // Exodus 30:1-10 - 1 x 1 x 2 cubits, acacia overlaid with gold, 4 horns,
  // standing directly before the veil of the Holy of Holies
  const size = 1 * CUBIT;   // 0.45m
  const height = 2 * CUBIT; // 0.9m

  return (
    <group position={position}>
      {/* Main body - gold overlaid */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Gold crown molding at top */}
      <mesh position={[0, height + 0.02, 0]}>
        <boxGeometry args={[size + 0.06, 0.04, size + 0.06]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Four horns at the top corners */}
      {[
        [-size / 2, height + 0.04, -size / 2],
        [size / 2, height + 0.04, -size / 2],
        [-size / 2, height + 0.04, size / 2],
        [size / 2, height + 0.04, size / 2],
      ].map((pos, i) => (
        <mesh key={`horn-${i}`} position={pos as [number, number, number]} castShadow>
          <coneGeometry args={[0.045, 0.16, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* Glowing incense coals */}
      <mesh position={[0, height + 0.045, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
        <meshStandardMaterial color={0xFF5522} emissive={0xCC3300} emissiveIntensity={2.2} />
      </mesh>

      {/* Gold rings + staves (Ex 30:4-5) */}
      {[-size / 2 - 0.02, size / 2 + 0.02].map((x, i) => (
        <mesh key={`ring-${i}`} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.045, 0.012, 6, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}
      {[-size / 2 - 0.02, size / 2 + 0.02].map((x, i) => (
        <mesh key={`stave-${i}`} position={[x, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, size + 0.3, 8]} />
          <meshStandardMaterial {...ACACIA_WOOD} />
        </mesh>
      ))}

      {/* Incense smoke haze + warm coal light */}
      <mesh position={[0, height + 0.3, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={0xFFFFFF} transparent opacity={0.07} />
      </mesh>
      <pointLight position={[0, height + 0.2, 0]} intensity={0.5} color={0xFF8833} distance={4} decay={2} />
    </group>
  );
}
