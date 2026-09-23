import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
  BYSSUS_CHERUBIM,
  SCREEN_MAT,
  ROPE,
  BREAD,
  FLAME,
} from '../utils/materials';
import { Instanced, ropeTransform, type InstanceTransform, type Vec3 } from '../utils/instancing';

// Heiligen nach Ex 26,15-37 / SPEC:
// Stiftshütte: 30 Ellen lang (13,5m, z = 31,5 ... 45), 10 Ellen breit (4,5m), 10 Ellen hoch (4,5m)
// Wände = akazienhölzerne Balken mit Gold überzogen (KEIN Stoff), auf Silbersockeln,
// gehalten von 5 goldenen Stangen pro Seite
// Dach: 4 Schichten (Byssus/Cherubim, Ziegenhaar, Widderfell rot, Tachasch) mit 1 Ellen Überhang vorn
// Einrichtung: Menora (~1 Elle hoch) Süd, Schaubrottisch (1,5 Ellen hoch) Nord,
// Räucheraltar direkt vor dem Vorhang (z = 39,7)
//
// Performance (Budget-Regel 2/5): Balken, Sockel, Stangen, Ringe, Brote und
// Pfosten als InstancedMeshes; Dachunterseite als EINE texturierte Plane;
// castShadow NUR an grossen Silhouetten (Balken, Dach, Menora-Fuss).

const PLANK_W = 1.5 * CUBIT;   // 0,675m Balkenbreite
const HALF_W = TENT_WIDTH / 2; // 2,25m
// Balken des Heiligen enden, wo die Balken des Allerheiligsten beginnen (z = 40,275)
export const HOLY_WALL_SPLIT_Z = HOLY_PLACE_Z_START + 13 * PLANK_W;

// Modul-Geometrien (Budget-Regel 8)
const sideBoardGeo = new THREE.BoxGeometry(0.12, TENT_HEIGHT - 0.2, 1); // Tiefe via scale
const socketGeo = new THREE.BoxGeometry(0.28, 0.2, 0.36);
const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);            // Länge via scale
const ringGeo = new THREE.TorusGeometry(0.052, 0.012, 6, 12);
const loavesGeo = new THREE.BoxGeometry(0.17, 0.038, 0.13);
const roofPegGeo = new THREE.CylinderGeometry(0.022, 0.014, 0.25, 6);
const roofRopeGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);

// Identische Inline-Geometrien als Modul-Konstanten (Budget-Regel 8)
const tableLegGeo = new THREE.BoxGeometry(0.06, 1.5 * CUBIT - 0.1, 0.06);  // Schaubrottisch-Beine
const crownTorusGeo = new THREE.TorusGeometry(CUBIT / 2 - 0.01, 0.012, 6, 20); // Doppelskranz
const cornerRingGeo = new THREE.TorusGeometry(0.035, 0.01, 6, 12);          // Tisch-Eckenringe
const incenseHornGeo = new THREE.ConeGeometry(0.045, 0.16, 8);              // Raeuchar-Hoerner
const incenseRingGeo = new THREE.TorusGeometry(0.045, 0.012, 6, 12);        // Raeuchar-Ringe
const flameConeGeo = new THREE.ConeGeometry(0.018, 0.06, 6);                // Menora-Flaemmchen

export function HolyPlace() {
  return (
    <group>
      {/* === GOLDÜBERZOGENE AKAZIENBALKEN - Süd & Nord (Heiligen) === */}
      <SideBeamWall x={-HALF_W} zStart={HOLY_PLACE_Z_START} zEnd={HOLY_WALL_SPLIT_Z} />
      <SideBeamWall x={HALF_W} zStart={HOLY_PLACE_Z_START} zEnd={HOLY_WALL_SPLIT_Z} />

      {/* === 4 DACHSCHICHTEN (Ex 26,1-14) über dem ganzen Zelt === */}
      <RoofLayers />

      {/* === EINGANGSSCHIRM - 5 Säulen, bunter Vorhang (Ex 26,36-37) === */}
      <EntranceScreen />

      {/* === MENORA (Ex 25,31-40) - Südseite, ~1 Elle hoch === */}
      <Menora position={[MENORA_X, 0, FURNITURE_Z]} />

      {/* === SCHAUBROTTISCH (Ex 25,23-30) - Nordseite, 1,5 Ellen hoch === */}
      <ShowbreadTable position={[TABLE_X, 0, FURNITURE_Z]} />

      {/* === RÄUCHERALTAR (Ex 30,1-10) - direkt vor dem Vorhang === */}
      <IncenseAltar position={[0, 0, INCENSE_ALTAR_Z]} />
    </group>
  );
}

interface SideBeamWallProps {
  x: number;
  zStart: number;
  zEnd: number;
}

// Wand aus goldüberzogenen Balken entlang der z-Achse, mit Silbersockeln und
// 5 goldüberzogenen Stangen in Goldenen Ringen (Ex 26,15-29); die mittlere
// Stange läuft durch, die anderen 4 treffen sich in der Mitte (Ex 26,27-28).
// Exportiert zur Wiederverwendung durch HolyOfHolies.
export function SideBeamWall({ x, zStart, zEnd }: SideBeamWallProps) {
  const length = zEnd - zStart;
  const count = Math.round(length / PLANK_W);
  const spacing = length / count;
  const plankLen = spacing * 0.93; // kleine Lücke -> goldene Streifen-Silhouette
  const barYs = [0.55, 1.4, TENT_HEIGHT / 2, 3.1, 3.95];
  const ringPlanks = [2, Math.floor(count / 2), count - 3];

  const boards: InstanceTransform[] = [];
  const sockets: InstanceTransform[] = [];
  for (let i = 0; i < count; i++) {
    const z = zStart + spacing * (i + 0.5);
    boards.push({ position: [x, TENT_HEIGHT / 2 + 0.2, z], scale: [1, 1, plankLen] });
    sockets.push({ position: [x, 0.1, z] });
  }

  // 5 Stangen: mittlere durchgehend, 4 halbe treffen sich in der Mitte
  const bars: InstanceTransform[] = [];
  for (let bi = 0; bi < barYs.length; bi++) {
    const y = barYs[bi];
    if (bi === 2) {
      bars.push({
        position: [x, y, (zStart + zEnd) / 2],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, length, 1],
      });
    } else {
      for (const half of [-1, 1]) {
        bars.push({
          position: [x, y, (zStart + zEnd) / 2 + half * (length / 4 + 0.015)],
          rotation: [Math.PI / 2, 0, 0],
          scale: [1, length / 2, 1],
        });
      }
    }
  }

  // Goldene Ringe an den Stangen
  const rings: InstanceTransform[] = [];
  for (const y of barYs) {
    for (const pi of ringPlanks) {
      rings.push({ position: [x, y, zStart + spacing * (pi + 0.5)] });
    }
  }

  return (
    <group>
      {/* Balken (grosse Silhouette) + Silbersockel (Ex 26,19) */}
      <Instanced geometry={sideBoardGeo} material={GOLD} transforms={boards} castShadow receiveShadow />
      <Instanced geometry={socketGeo} material={SILVER} transforms={sockets} />

      <Instanced geometry={barGeo} material={GOLD} transforms={bars} />
      <Instanced geometry={ringGeo} material={GOLD} transforms={rings} />
    </group>
  );
}

function RoofLayers() {
  // 4 Schichten von innen nach aussen (Ex 26,1-14):
  // a) 10 Byssus-Vorhänge, blau/violett/scharlach mit Cherubim-Wirkerei
  // b) 11 Ziegenhaar-Vorhänge
  // c) rot gefärbte Widderfelle
  // d) Tachasch-Felle (dunkel)
  // 1 Ellen Überhang vorn (Osten, z = 31,5), hinten hängt die halbe Decke (Ex 26,9.12-13)
  // Hängetau + Bronzepflöcke an der Aussenkante der Ziegenhaardecke (Ex 27,19), je 5 pro Seite
  const frontOverhang = CUBIT;
  const layers = [
    { w: 4.9, t: 0.03, back: 45.3, y: 4.515, mat: BYSSUS_CHERUBIM },
    { w: 5.35, t: 0.04, back: 45.6, y: 4.56, mat: GOAT_HAIR },
    { w: 5.8, t: 0.04, back: 45.9, y: 4.61, mat: RAM_SKIN },
    { w: 6.25, t: 0.05, back: 46.2, y: 4.66, mat: TACHASH },
  ];
  const goatHair = layers[1];
  const ropeZs = Array.from({ length: 5 }, (_, i) => 32 + i * 3.25);

  // Unterperspektive der Byssus-Schicht: EINE texturierte Plane
  // (4-farbige Querstreifen + goldene Cherubim-Andeutungen)
  const underRoof = layers[0];
  const underFront = TENT_Z_START - frontOverhang;
  const underLen = underRoof.back - underFront;

  const roofRopes: InstanceTransform[] = [];
  const roofPegs: InstanceTransform[] = [];
  for (const side of [-1, 1]) {
    for (const z of ropeZs) {
      const edgeX = side * (goatHair.w / 2);
      const pegX = side * (goatHair.w / 2 + 1.3);
      roofRopes.push(ropeTransform([edgeX, goatHair.y - goatHair.t / 2, z], [pegX, 0.25, z]));
      roofPegs.push({ position: [pegX, 0.125, z] });
    }
  }

  return (
    <group>
      <Instanced geometry={roofPegGeo} material={BRONZE} transforms={roofPegs} />
      <Instanced geometry={roofRopeGeo} material={ROPE} transforms={roofRopes} />

      {layers.map((l, i) => {
        const front = TENT_Z_START - frontOverhang - i * 0.05;
        const len = l.back - front;
        const zCenter = (front + l.back) / 2;
        return (
          <group key={`roof-${i}`}>
            {/* Dachschicht (grosse Silhouette) */}
            <mesh position={[0, l.y, zCenter]} material={l.mat} castShadow={i >= 2}>
              <boxGeometry args={[l.w, l.t, len]} />
            </mesh>
            {/* Hinten hängt der Vorhang herunter (halbe Decke) */}
            <mesh position={[0, 3.35, l.back - 0.02]} material={l.mat}>
              <planeGeometry args={[l.w, 2.3]} />
            </mesh>

            {/* Unterseite der Byssus-Schicht (Innenansicht): 1 texturierte Plane */}
            {i === 0 && (
              <mesh
                position={[0, l.y - l.t / 2 - 0.001, underFront + underLen / 2]}
                rotation={[Math.PI / 2, 0, 0]}
                material={l.mat}
              >
                <planeGeometry args={[l.w, underLen]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function EntranceScreen() {
  // 5 Säulen aus Akazien mit Gold überzogen, Bronzesockel (Ex 26,37)
  const xs = [-1.8, -0.9, 0, 0.9, 1.8];
  const screenH = TENT_HEIGHT - 0.15;

  const pedestals: InstanceTransform[] = [];
  const shafts: InstanceTransform[] = [];
  const caps: InstanceTransform[] = [];
  for (const x of xs) {
    pedestals.push({ position: [x, 0.07, HOLY_PLACE_Z_START] });
    shafts.push({ position: [x, TENT_HEIGHT / 2 + 0.07, HOLY_PLACE_Z_START] });
    caps.push({ position: [x, TENT_HEIGHT + 0.13, HOLY_PLACE_Z_START] });
  }

  return (
    <group>
      <Instanced geometry={entrancePedestalGeo} material={BRONZE} transforms={pedestals} />
      <Instanced geometry={entranceShaftGeo} material={GOLD} transforms={shafts} castShadow />
      <Instanced geometry={entranceCapGeo} material={GOLD} transforms={caps} />

      {/* Bunter Eingangsschirm: blau, violett, scharlach, Byssus (Ex 26,36)
          - 1 Plane mit Canvas-Textur, 5 Streifen über die volle Breite */}
      <mesh
        position={[0, screenH / 2 + 0.1, HOLY_PLACE_Z_START + 0.03]}
        material={SCREEN_MAT}
      >
        <planeGeometry args={[TENT_WIDTH, screenH]} />
      </mesh>
    </group>
  );
}

const entrancePedestalGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.14, 8);
const entranceShaftGeo = new THREE.CylinderGeometry(0.05, 0.06, TENT_HEIGHT, 8);
const entranceCapGeo = new THREE.CylinderGeometry(0.07, 0.045, 0.1, 8);

// Zeichnet einen goldenen gebogenen Arm entlang einer CatmullRomCurve3
// (mandelförmiger Schwung der Menora-Arme, Ex 25,31-36)
function CurvedBranch({ points }: { points: Vec3[] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    );
    return new THREE.TubeGeometry(curve, 24, 0.016, 8, false);
  }, [points]);

  return <mesh geometry={geometry} material={GOLD} />;
}

function Menora({ position }: { position: Vec3 }) {
  // 2. Mose 25,31-40 - ein Talent Gold, ~1 Elle (≈1m) hoch
  // 7 Arme (3 Paare + Mittelschaft), Mandelblüten-Knäufe, Öllämpchen mit Flammen
  const baseY = 0.12;
  const stemTop = 0.95;
  const lampY = 0.98;
  const pairs: Array<{ lampX: number; elbowY: number }> = [
    { lampX: 0.11, elbowY: 0.42 },
    { lampX: 0.21, elbowY: 0.58 },
    { lampX: 0.31, elbowY: 0.74 },
  ];

  // Flammen-Animation: y-Scale +-15%, Phasen versetzt (keine Allokation pro Frame)
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flames = flameRefs.current;
    for (let i = 0; i < flames.length; i++) {
      const f = flames[i];
      if (!f) continue;
      f.scale.y = 1 + Math.sin(t * 6 + i * 0.9) * 0.15;
      f.rotation.y = t * 0.5 + i * 0.7;
    }
  });

  return (
    <group position={position}>
      {/* Fuss */}
      <mesh position={[0, baseY / 2, 0]} material={GOLD} castShadow>
        <cylinderGeometry args={[0.1, 0.16, baseY, 12]} />
      </mesh>

      {/* Mittelschaft */}
      <mesh position={[0, baseY + (stemTop - baseY) / 2, 0]} material={GOLD} castShadow>
        <cylinderGeometry args={[0.022, 0.03, stemTop - baseY, 8]} />
      </mesh>

      {/* Mandelblüten-Knäufe am Schaft */}
      {[0.3, 0.55, 0.8].map((y, i) => (
        <mesh key={`knop-${i}`} position={[0, y, 0]} material={GOLD}>
          <sphereGeometry args={[0.028, 8, 8]} />
        </mesh>
      ))}

      {/* 3 Paar gebogener Arme (CatmullRom-Schwünge) */}
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
              {/* Blütenknauf am Schwung */}
              <mesh position={[side * p.lampX * 0.55, (p.elbowY + midY) / 2, 0]} material={GOLD}>
                <sphereGeometry args={[0.02, 8, 8]} />
              </mesh>
            </group>
          );
        })
      )}

      {/* 7 Lämpchen (Schalen) mit Flammen — EIN geteiltes FLAME-Material */}
      {[0, ...pairs.map((p) => p.lampX * -1), ...pairs.map((p) => p.lampX)].map((x, i) => (
        <group key={`lamp-${i}`} position={[x, lampY, 0]}>
          <mesh material={GOLD}>
            <cylinderGeometry args={[0.04, 0.028, 0.06, 8]} />
          </mesh>
          <mesh
            ref={(m) => { flameRefs.current[i] = m; }}
            position={[0, 0.06, 0]}
            geometry={flameConeGeo}
            material={FLAME}
          />
        </group>
      ))}

      {/* Goldene Geräte des Leuchters (Ex 25,38): Zangen und Snuffschaalen */}
      <mesh position={[0.19, 0.008, 0.09]} material={GOLD}>
        <cylinderGeometry args={[0.02, 0.014, 0.016, 8]} />
      </mesh>
      <mesh position={[0.25, 0.007, 0.01]} material={GOLD}>
        <cylinderGeometry args={[0.017, 0.012, 0.014, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={`tongs-${s}`}
          position={[0.22 + s * 0.011, 0.004, -0.05]}
          rotation={[0, 0.4 + s * 0.14, 0]}
          material={GOLD}
        >
          <boxGeometry args={[0.045, 0.006, 0.007]} />
        </mesh>
      ))}
      {/* Flackerndes Licht der Menora lebt in TabernacleLighting (kein Duplikat) */}
    </group>
  );
}

function ShowbreadTable({ position }: { position: Vec3 }) {
  // 2. Mose 25,23-30 - 2 x 1 x 1,5 Ellen (0,9 x 0,45 x 0,675m), Akazien mit Gold überzogen
  const w = 2 * CUBIT;   // 0,9m
  const d = 1 * CUBIT;   // 0,45m
  const h = 1.5 * CUBIT; // 0,675m - NICHT 2,5 Ellen!
  const topY = h;

  // 12 Schaubrote: 2 Stapel à 6 (Ex 25,30 / 3. Mose 24,5-9) als InstancedMesh
  const loaves: InstanceTransform[] = [];
  for (const stackX of [-0.2, 0.2]) {
    for (let j = 0; j < 6; j++) {
      loaves.push({
        position: [stackX, topY + 0.045 + j * 0.042, 0],
        rotation: [0, j % 2 === 0 ? 0.12 : -0.12, 0],
      });
    }
  }

  return (
    <group position={position}>
      {/* Platte */}
      <mesh position={[0, topY - 0.025, 0]} material={GOLD} castShadow>
        <boxGeometry args={[w, 0.05, d]} />
      </mesh>

      {/* Goldener Doppelkranz (zwei Ringe, geteilte Geometrie) */}
      <mesh position={[0, topY + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={crownTorusGeo} material={GOLD} />
      <mesh position={[0, topY + 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={crownTorusGeo} material={GOLD} />

      {/* 4 Beine (geteilte Geometrie) */}
      {[
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={[pos[0], h / 2 - 0.05, pos[1]]} geometry={tableLegGeo} material={GOLD} />
      ))}

      {/* 4 goldene Ringe an den Ecken + Tragstangen (Ex 25,26-28) */}
      {[
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={[pos[0], h - 0.12, pos[1]]} rotation={[0, Math.PI / 2, 0]} geometry={cornerRingGeo} material={GOLD} />
      ))}
      {[-d / 2 + 0.06, d / 2 - 0.06].map((z, i) => (
        <mesh key={`stave-${i}`} position={[0, h - 0.12, z]} rotation={[0, 0, Math.PI / 2]} material={GOLD}>
          <cylinderGeometry args={[0.022, 0.022, w + 0.5, 8]} />
        </mesh>
      ))}

      {/* Schaubrote: 2 Stapel à 6 - instanziert */}
      <Instanced geometry={loavesGeo} material={BREAD} transforms={loaves} />

      {/* Goldene Geräte: Schalen, Löffel, Kannen (Ex 25,29) */}
      <mesh position={[-w / 2 + 0.09, topY + 0.035, d / 4]} material={GOLD}>
        <cylinderGeometry args={[0.035, 0.025, 0.06, 8]} />
      </mesh>
      <mesh position={[-w / 2 + 0.09, topY + 0.035, -d / 4]} material={GOLD}>
        <cylinderGeometry args={[0.03, 0.02, 0.05, 8]} />
      </mesh>
      <mesh position={[w / 2 - 0.09, topY + 0.06, 0]} material={GOLD}>
        <sphereGeometry args={[0.045, 10, 10]} />
      </mesh>
      <mesh position={[w / 2 - 0.09, topY + 0.12, 0]} material={GOLD}>
        <cylinderGeometry args={[0.014, 0.02, 0.06, 8]} />
      </mesh>
    </group>
  );
}

function IncenseAltar({ position }: { position: Vec3 }) {
  // 2. Mose 30,1-10 - 1 x 1 x 2 Ellen, Akazien mit Gold überzogen, 4 Hörner,
  // steht direkt vor dem Vorhang des Allerheiligsten
  const size = 1 * CUBIT;   // 0,45m
  const height = 2 * CUBIT; // 0,9m

  return (
    <group position={position}>
      {/* Korpus - gold überzogen (grosse Silhouette) */}
      <mesh position={[0, height / 2, 0]} material={GOLD} castShadow>
        <boxGeometry args={[size, height, size]} />
      </mesh>

      {/* Goldene Kranzleiste oben */}
      <mesh position={[0, height + 0.02, 0]} material={GOLD}>
        <boxGeometry args={[size + 0.06, 0.04, size + 0.06]} />
      </mesh>

      {/* Vier Hörner an den oberen Ecken (geteilte Geometrie) */}
      {[
        [-size / 2, height + 0.04, -size / 2],
        [size / 2, height + 0.04, -size / 2],
        [-size / 2, height + 0.04, size / 2],
        [size / 2, height + 0.04, size / 2],
      ].map((pos, i) => (
        <mesh key={`horn-${i}`} position={pos as Vec3} geometry={incenseHornGeo} material={GOLD} />
      ))}

      {/* Glühende Räucherkohle - eigene emissive Instanz */}
      <mesh position={[0, height + 0.045, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
        <meshStandardMaterial color={0xFF5522} emissive={0xCC3300} emissiveIntensity={2.2} />
      </mesh>

      {/* Goldene Ringe + Stangen (Ex 30,4-5) */}
      {[-size / 2 - 0.02, size / 2 + 0.02].map((x, i) => (
        <mesh key={`ring-${i}`} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={incenseRingGeo} material={GOLD} />
      ))}
      {[-size / 2 - 0.02, size / 2 + 0.02].map((x, i) => (
        <mesh key={`stave-${i}`} position={[x, 0.3, 0]} material={ACACIA_WOOD}>
          <cylinderGeometry args={[0.02, 0.02, size + 0.3, 8]} />
        </mesh>
      ))}

      {/* Räucherhauch + warmes Kohlenlicht (kein Schatten) */}
      <mesh position={[0, height + 0.3, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={0xFFFFFF} transparent opacity={0.07} />
      </mesh>
      <pointLight position={[0, height + 0.2, 0]} intensity={0.5} color={0xFF8833} distance={4} decay={2} />
    </group>
  );
}
