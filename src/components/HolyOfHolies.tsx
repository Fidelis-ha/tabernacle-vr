import * as THREE from 'three';
import {
  CUBIT,
  TENT_WIDTH,
  TENT_HEIGHT,
  HOLY_OF_HOLIES_SIZE,
  HOLY_OF_HOLIES_Z_START,
  HOLY_OF_HOLIES_Z_END,
} from './TabernacleFloor';
import { SideBeamWall, HOLY_WALL_SPLIT_Z } from './HolyPlace';
import { GOLD, SILVER, CURTAIN_BLUE, CURTAIN_PURPLE, CURTAIN_SCARLET } from '../utils/materials';

// Holy of Holies per Exodus 25:10-22 / 26:31-34 / SPEC:
// Cube 4.5 x 4.5 x 4.5m (10 cubits), z = 40.5 ... 45
// Walls like the tabernacle: gold-overlaid acacia boards
// (west wall per Ex 26:22-25: 6 boards + 2 L-shaped corner boards = 8, 16 silver sockets)
// Veil (Parochet): 4 colors (blue, purple, scarlet, byssus) with cherubim embroidery,
// hung on 4 gold pillars on 4 silver sockets (Ex 26:32) at z = 40.5
// Ark: 2.5 x 1.5 x 1.5 cubits, 4 rings at the LOWER corners, carrying staves, solid gold Kapporet,
// large cherubim with spread wings (~1 cubit high)

const HALF_W = TENT_WIDTH / 2; // 2.25m
const VEIL_Z = HOLY_OF_HOLIES_Z_START; // 40.5

export function HolyOfHolies() {
  return (
    <group>
      {/* === GOLD-OVERLAID ACACIA BOARD WALLS (Most Holy section) === */}
      {/* South & north sides, z = 40.275 ... 45 */}
      <SideBeamWall x={-HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      <SideBeamWall x={HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      {/* West back wall: 6 boards + 2 L-shaped corner boards (Ex 26:22-25) */}
      <WestBeamWall />

      {/* === VEIL (PAROCHET) on 4 gold pillars (Ex 26:31-33) === */}
      <VeilWithPillars />

      {/* === SHEKINAH GLORY over the Ark: lighting lives in TabernacleLighting
           (no duplicate point-light pair here) === */}

      {/* === ARK OF THE COVENANT (Ex 25:10-22) === */}
      <ArkOfCovenant position={[0, 0, HOLY_OF_HOLIES_Z_START + HALF_W]} />
    </group>
  );
}

function WestBeamWall() {
  // West wall per Ex 26:22-25: SIX boards across the inner width + TWO L-shaped
  // corner boards (one leg on the west face, one leg embracing the end of the
  // side wall from the outside) = 8 boards total, 16 silver sockets
  // (2 sockets per board -> 6*2 + 2*2 = 16).
  const count = 6;
  const spacing = TENT_WIDTH / count;
  const backZ = HOLY_OF_HOLIES_Z_END; // 45
  const plankLen = spacing * 0.93;
  // Ex 26:27-28: the MIDDLE of the 5 bars runs end to end, the other 4 are
  // half as long and meet in the middle (small offset visible, OK)
  const barYs = [0.55, 1.4, TENT_HEIGHT / 2, 3.1, 3.95];

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const x = -HALF_W + spacing * (i + 0.5);
        return (
          <group key={`wplank-${i}`}>
            <mesh position={[x, TENT_HEIGHT / 2 + 0.2, backZ - 0.06]} castShadow receiveShadow>
              <boxGeometry args={[plankLen, TENT_HEIGHT - 0.2, 0.12]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
            {/* 2 silver sockets under each board (Ex 26:21, one talent each) */}
            {[-0.14, 0.14].map((dx, s) => (
              <mesh key={`wsock-${s}`} position={[x + dx, 0.1, backZ - 0.06]} castShadow>
                <boxGeometry args={[Math.min(0.2, plankLen - 0.14), 0.2, 0.28]} />
                <meshStandardMaterial {...SILVER} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* 2 L-shaped corner boards (Ex 26:23-25 "doubled boards"): each with one
          leg on the west face and one leg embracing the side wall end from outside */}
      {[-1, 1].map((side) => (
        <group key={`corner-${side}`}>
          {/* Leg on the west face */}
          <mesh
            position={[side * (HALF_W + 0.03), TENT_HEIGHT / 2 + 0.2, backZ - 0.06]}
            castShadow
          >
            <boxGeometry args={[0.3, TENT_HEIGHT - 0.2, 0.12]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          {/* Leg embracing the side wall end from outside */}
          <mesh
            position={[side * (HALF_W + 0.12), TENT_HEIGHT / 2 + 0.2, backZ - 0.28]}
            castShadow
          >
            <boxGeometry args={[0.12, TENT_HEIGHT - 0.2, 0.5]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          {/* Silver sockets under the corner board (2 per corner) */}
          <mesh position={[side * (HALF_W + 0.03), 0.1, backZ - 0.06]} castShadow>
            <boxGeometry args={[0.3, 0.2, 0.28]} />
            <meshStandardMaterial {...SILVER} />
          </mesh>
          <mesh position={[side * (HALF_W + 0.12), 0.1, backZ - 0.28]} castShadow>
            <boxGeometry args={[0.28, 0.2, 0.36]} />
            <meshStandardMaterial {...SILVER} />
          </mesh>
        </group>
      ))}

      {/* 5 bars along the west wall (Ex 26:27-28):
          middle bar runs through, the other 4 are half bars meeting in the middle */}
      {barYs.map((y, bi) =>
        bi === 2 ? (
          <mesh key={`wbar-${bi}`} position={[0, y, backZ - 0.12]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, TENT_WIDTH, 8]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        ) : (
          [-1, 1].map((half) => (
            <mesh
              key={`wbar-${bi}-${half}`}
              position={[half * (TENT_WIDTH / 4 + 0.015), y, backZ - 0.12]}
              rotation={[0, Math.PI / 2, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.04, 0.04, TENT_WIDTH / 2, 8]} />
              <meshStandardMaterial {...GOLD} />
            </mesh>
          ))
        )
      )}
    </group>
  );
}

function VeilWithPillars() {
  // 4-color veil with cherubim embroidery, on 4 gold pillars with silver sockets (Ex 26:31-33)
  const veilH = TENT_HEIGHT - 0.05;
  const colors = [CURTAIN_BLUE, CURTAIN_PURPLE, CURTAIN_SCARLET, { color: 0xF5EFE0 }];
  const stripeW = TENT_WIDTH / 4;
  const pillarXs = [-1.6875, -0.5625, 0.5625, 1.6875];

  return (
    <group position={[0, 0, VEIL_Z]}>
      {/* 4 gold pillars (Ex 26:32) */}
      {pillarXs.map((x, i) => (
        <group key={`vpillar-${i}`} position={[x, 0, 0.06]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.28, 0.2, 0.28]} />
            <meshStandardMaterial {...SILVER} />
          </mesh>
          <mesh position={[0, TENT_HEIGHT / 2 + 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, TENT_HEIGHT, 10]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <mesh position={[0, TENT_HEIGHT + 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.04, 0.12, 10]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
        </group>
      ))}

      {/* Veil: 4 vertical color stripes with cherubim embroidery */}
      <group position={[0, 0, -0.02]}>
        {colors.map((c, i) => (
          <mesh key={`vstripe-${i}`} position={[-TENT_WIDTH / 2 + stripeW * (i + 0.5), veilH / 2 + 0.05, 0]}>
            <planeGeometry args={[stripeW, veilH]} />
            <meshStandardMaterial color={c.color} roughness={0.65} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* Cherubim embroidery (gold thread overlay, stylized) */}
        {[-0.8, 0.8].map((x, i) => (
          <group key={`emb-${i}`} position={[x, veilH * 0.55, 0.02]}>
            <mesh rotation={[0, 0, i === 0 ? 0.5 : -0.5]}>
              <planeGeometry args={[0.7, 0.28]} />
              <meshStandardMaterial color={0xD4AF37} metalness={0.6} roughness={0.35} transparent opacity={0.35} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[0, 0, i === 0 ? -0.4 : 0.4]}>
              <planeGeometry args={[0.55, 0.22]} />
              <meshStandardMaterial color={0xD4AF37} metalness={0.6} roughness={0.35} transparent opacity={0.28} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function ArkOfCovenant({ position }: { position: [number, number, number] }) {
  // Exodus 25:10-22 - 2.5 x 1.5 x 1.5 cubits, acacia overlaid with gold
  const length = 2.5 * CUBIT; // 1.125m
  const width = 1.5 * CUBIT;  // 0.675m
  const height = 1.5 * CUBIT; // 0.675m
  const footH = 0.06;
  const bodyY = footH + height / 2;
  const kaporetY = footH + height + 0.045;

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main ark body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Gold molding (crown) around the top rim */}
      <mesh position={[0, footH + height - 0.03, 0]}>
        <boxGeometry args={[length + 0.05, 0.05, width + 0.05]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* 4 gold rings at the 4 LOWER corners (Ex 25:12), two per long side */}
      {[
        [-length / 2 + 0.08, footH + 0.12, width / 2 + 0.035],
        [length / 2 - 0.08, footH + 0.12, width / 2 + 0.035],
        [-length / 2 + 0.08, footH + 0.12, -width / 2 - 0.035],
        [length / 2 - 0.08, footH + 0.12, -width / 2 - 0.035],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.055, 0.018, 6, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* Carrying staves - acacia overlaid with gold, remaining inserted (Ex 25:13-15) */}
      {[width / 2 + 0.035, -width / 2 - 0.035].map((z, i) => (
        <mesh key={`stave-${i}`} position={[0, footH + 0.12, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, length + 0.7, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      ))}

      {/* Kapporet (mercy seat) - solid gold (Ex 25:17) */}
      <mesh position={[0, kaporetY, 0]} castShadow>
        <boxGeometry args={[length + 0.06, 0.09, width + 0.06]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* 2 large CHERUBIM - wings spread upward, touching in the middle (Ex 25:18-20) */}
      <Cherub position={[-0.32, kaporetY + 0.045, 0]} facing={1} />
      <Cherub position={[0.32, kaporetY + 0.045, 0]} facing={-1} />
    </group>
  );
}

function Cherub({ position, facing }: { position: [number, number, number]; facing: 1 | -1 }) {
  // Hammered gold, out of one piece with the Kapporet (Ex 25:18)
  // Wings spread upward (Ex 25:20): inner wings steep (65 deg) and meeting
  // exactly in the middle above the Kapporet, outer wings toward the walls.
  const wingInner = 0.5;  // wing toward the other cherub, tip reaches x = 0
  const wingOuter = 0.55; // wing toward the wall
  const innerAngle = THREE.MathUtils.degToRad(60);
  const outerAngle = THREE.MathUtils.degToRad(50);
  // Inner wing: root at the body edge (|x| = 0.25), tip exactly at x = 0
  // (0.5 * cos(60 deg) = 0.25 horizontal span)
  const innerCenterX = -facing * (0.25 - (wingInner / 2) * Math.cos(innerAngle));
  const innerCenterY = 0.34 + (wingInner / 2) * Math.sin(innerAngle);
  // Outer wing: rooted at the outer body edge, rising steeply outward
  const outerCenterX = -facing * (0.39 + (wingOuter / 2) * Math.cos(outerAngle));
  const outerCenterY = 0.38 + (wingOuter / 2) * Math.sin(outerAngle);
  // Rotation about z so the wing points up and toward/away from the center
  const innerRotation = Math.PI / 2 + facing * (innerAngle - Math.PI / 2);
  const outerRotation = Math.PI / 2 + facing * (Math.PI / 2 - outerAngle);

  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.36, 10]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Head, dignified but without detailed human features */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Inner wing - steep, spread toward the middle, touching the other cherub */}
      <mesh position={[innerCenterX, innerCenterY, 0]} rotation={[0, 0, innerRotation]} castShadow>
        <boxGeometry args={[wingInner, 0.025, 0.3]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Outer wing - spread upward/outward toward the wall */}
      <mesh position={[outerCenterX, outerCenterY, 0]} rotation={[0, 0, outerRotation]} castShadow>
        <boxGeometry args={[wingOuter, 0.025, 0.3]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* Wing feather layers for dignity */}
      <mesh position={[innerCenterX, innerCenterY - 0.04, 0]} rotation={[0, 0, innerRotation + facing * 0.12]}>
        <boxGeometry args={[wingInner * 0.85, 0.018, 0.2]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[outerCenterX, outerCenterY - 0.04, 0]} rotation={[0, 0, outerRotation - facing * 0.1]}>
        <boxGeometry args={[wingOuter * 0.85, 0.018, 0.2]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
    </group>
  );
}
