import { useRef } from 'react';
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
import { mergeParts, type MergePart } from '../utils/merge';

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
const loavesGeo = new THREE.CylinderGeometry(0.085, 0.08, 0.038, 14);      // flach-runde Brote (B3)
const roofPegGeo = new THREE.CylinderGeometry(0.022, 0.014, 0.25, 6);
const roofRopeGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);

// Identische Inline-Geometrien als Modul-Konstanten (Budget-Regel 8)
const tableLegGeo = new THREE.CylinderGeometry(0.026, 0.032, 1.5 * CUBIT - 0.1, 8); // Bein (profiert, B3)
const tableLegFootGeo = new THREE.TorusGeometry(0.036, 0.009, 6, 12);      // Ring-Fuss (B3)
const crownTorusGeo = new THREE.TorusGeometry(CUBIT / 2 - 0.01, 0.012, 6, 20); // Doppelskranz
const cornerRingGeo = new THREE.TorusGeometry(0.035, 0.01, 6, 12);          // Tisch-Eckenringe
const incenseHornGeo = new THREE.ConeGeometry(0.045, 0.16, 8);              // Raeuchar-Hoerner
const incenseRingGeo = new THREE.TorusGeometry(0.045, 0.012, 6, 12);        // Raeuchar-Ringe
const lampGeo = new THREE.CylinderGeometry(0.04, 0.028, 0.06, 8);           // 7 Oellämpchen-Schalen
const knopGeo = new THREE.SphereGeometry(0.028, 8, 8);                      // Mandelblüten-Knauf (Schaft)
const knopGeoSmall = new THREE.SphereGeometry(0.02, 8, 8);                  // Mandelblüten-Knauf (Arme)
// B1: filigrane Menora-Zutaten (geteilte Modul-Geometrien)
const footStep1Geo = new THREE.CylinderGeometry(0.16, 0.18, 0.045, 14);     // gestufter Fuss
const footStep2Geo = new THREE.CylinderGeometry(0.115, 0.14, 0.04, 14);
const footStep3Geo = new THREE.CylinderGeometry(0.075, 0.1, 0.045, 14);
const calotteGeo = new THREE.ConeGeometry(0.015, 0.024, 6);                 // Blütenkalotte
const calyxGeo = new THREE.ConeGeometry(0.026, 0.05, 8);                    // Kelchblüte (invers)
const flamePlaneGeo = new THREE.PlaneGeometry(0.032, 0.064);                // Flamme (2 Ebenen)

// === P1 Draw-Call-Merge: statische GOLD-Teile je Geraet in EINE Geometrie
// (Vorbild Animals.tsx bodyGeo); animierte Ebenen (Flammen) bleiben einzeln ===

// --- Menora (Ex 25,31-40) ---
const MENORA_PAIRS = [
  { lampX: 0.11, elbowY: 0.42 },
  { lampX: 0.21, elbowY: 0.58 },
  { lampX: 0.31, elbowY: 0.74 },
];
const MENORA_LAMP_Y = 0.98;
const MENORA_STEM_BASE_Y = 0.12;
const MENORA_STEM_TOP = 0.95;
const menoraStemGeo = new THREE.CylinderGeometry(0.022, 0.03, MENORA_STEM_TOP - MENORA_STEM_BASE_Y, 8);

function menoraBranchGeo(points: Vec3[]): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return new THREE.TubeGeometry(curve, 24, 0.016, 8, false);
}

const menoraGoldGeo: THREE.BufferGeometry = (() => {
  const parts: MergePart[] = [
    { geo: footStep1Geo, p: [0, 0.0225, 0] },
    { geo: footStep2Geo, p: [0, 0.065, 0] },
    { geo: footStep3Geo, p: [0, 0.1075, 0] },
    { geo: menoraStemGeo, p: [0, MENORA_STEM_BASE_Y + (MENORA_STEM_TOP - MENORA_STEM_BASE_Y) / 2, 0] },
  ];
  for (const y of [0.3, 0.55, 0.8]) {
    parts.push({ geo: knopGeo, p: [0, y, 0] });
    parts.push({ geo: calotteGeo, p: [0, y + 0.032, 0] });
    parts.push({ geo: calotteGeo, p: [0, y - 0.032, 0], r: [Math.PI, 0, 0] });
  }
  for (const pr of MENORA_PAIRS) {
    const midY = pr.elbowY + (MENORA_LAMP_Y - pr.elbowY) * 0.45;
    for (const side of [-1, 1]) {
      parts.push({
        geo: menoraBranchGeo([
          [side * 0.02, pr.elbowY, 0],
          [side * pr.lampX * 0.4, pr.elbowY + (midY - pr.elbowY) * 0.5, 0],
          [side * pr.lampX * 0.75, midY, 0],
          [side * pr.lampX, MENORA_LAMP_Y, 0],
        ]),
      });
      parts.push({ geo: knopGeoSmall, p: [side * pr.lampX * 0.55, (pr.elbowY + midY) / 2, 0] });
    }
  }
  for (const x of [0, ...MENORA_PAIRS.map((p) => p.lampX * -1), ...MENORA_PAIRS.map((p) => p.lampX)]) {
    parts.push({ geo: lampGeo, p: [x, MENORA_LAMP_Y, 0] });
    parts.push({ geo: calyxGeo, p: [x, MENORA_LAMP_Y - 0.05, 0], r: [Math.PI, 0, 0] });
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.014, 0.016, 8), p: [0.19, 0.008, 0.09] });
  parts.push({ geo: new THREE.CylinderGeometry(0.017, 0.012, 0.014, 8), p: [0.25, 0.007, 0.01] });
  parts.push({ geo: new THREE.BoxGeometry(0.045, 0.006, 0.007), p: [0.209, 0.004, -0.05], r: [0, 0.26, 0] });
  parts.push({ geo: new THREE.BoxGeometry(0.045, 0.006, 0.007), p: [0.231, 0.004, -0.05], r: [0, 0.54, 0] });
  return mergeParts(parts);
})();

// --- Schaubrottisch (Ex 25,23-30): 0,9 x 0,45 x 0,675 m ---
const TABLE_W = 2 * CUBIT;
const TABLE_D = CUBIT;
const TABLE_H = 1.5 * CUBIT;
const TABLE_TOP_Y = TABLE_H;

const tableGoldGeo: THREE.BufferGeometry = (() => {
  const legPos: [number, number][] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      legPos.push([sx * (TABLE_W / 2 - 0.06), sz * (TABLE_D / 2 - 0.06)]);
    }
  }
  const parts: MergePart[] = [
    { geo: new THREE.BoxGeometry(TABLE_W, 0.05, TABLE_D), p: [0, TABLE_TOP_Y - 0.025, 0] },
    { geo: crownTorusGeo, p: [0, TABLE_TOP_Y + 0.015, 0], r: [Math.PI / 2, 0, 0] },
    { geo: crownTorusGeo, p: [0, TABLE_TOP_Y + 0.042, 0], r: [Math.PI / 2, 0, 0], s: [0.94, 0.94, 1] },
  ];
  for (const [px, pz] of legPos) {
    parts.push({ geo: tableLegGeo, p: [px, TABLE_H / 2 - 0.05, pz] });
    parts.push({ geo: tableLegFootGeo, p: [px, 0.012, pz], r: [Math.PI / 2, 0, 0] });
    parts.push({ geo: cornerRingGeo, p: [px, TABLE_H - 0.12, pz], r: [0, Math.PI / 2, 0] });
  }
  for (const pz of [-TABLE_D / 2 + 0.06, TABLE_D / 2 - 0.06]) {
    parts.push({
      geo: new THREE.CylinderGeometry(0.022, 0.022, TABLE_W + 0.5, 8),
      p: [0, TABLE_H - 0.12, pz],
      r: [0, 0, Math.PI / 2],
    });
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.025, 0.06, 8), p: [-TABLE_W / 2 + 0.09, TABLE_TOP_Y + 0.035, TABLE_D / 4] });
  parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.02, 0.05, 8), p: [-TABLE_W / 2 + 0.09, TABLE_TOP_Y + 0.035, -TABLE_D / 4] });
  parts.push({ geo: new THREE.SphereGeometry(0.045, 10, 10), p: [TABLE_W / 2 - 0.09, TABLE_TOP_Y + 0.06, 0] });
  parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.02, 0.06, 8), p: [TABLE_W / 2 - 0.09, TABLE_TOP_Y + 0.12, 0] });
  return mergeParts(parts);
})();

// --- Raeucheraltar (Ex 30,1-10): 0,45 x 0,45 x 0,9 m ---
const INCENSE_SIZE = CUBIT;
const INCENSE_HEIGHT = 2 * CUBIT;

const incenseGoldGeo: THREE.BufferGeometry = (() => {
  const s = INCENSE_SIZE;
  const h = INCENSE_HEIGHT;
  const parts: MergePart[] = [
    { geo: new THREE.BoxGeometry(s, h, s), p: [0, h / 2, 0] },
    { geo: new THREE.BoxGeometry(s + 0.06, 0.04, s + 0.06), p: [0, h + 0.02, 0] },
  ];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({ geo: incenseHornGeo, p: [(sx * s) / 2, h + 0.04, (sz * s) / 2] });
    }
  }
  for (const sx of [-1, 1]) {
    parts.push({ geo: incenseRingGeo, p: [sx * (s / 2 + 0.02), 0.3, 0], r: [Math.PI / 2, 0, 0] });
  }
  return mergeParts(parts);
})();

const incenseStavesGeo: THREE.BufferGeometry = (() => {
  const s = INCENSE_SIZE;
  return mergeParts([
    { geo: new THREE.CylinderGeometry(0.02, 0.02, s + 0.3, 8), p: [-(s / 2 + 0.02), 0.3, 0] },
    { geo: new THREE.CylinderGeometry(0.02, 0.02, s + 0.3, 8), p: [s / 2 + 0.02, 0.3, 0] },
  ]);
})();

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
  // A3 (Ex 26,1-14): Schicht a (Byssus/Cherubim) ist die INNENDECKE — von
  // aussen unsichtbar. Ihre Box liegt daher VOLL innerhalb der Goldbalken
  // (w < TENT_WIDTH), der westliche "halbe Decke"-Hang entfaellt (innen gibt
  // es nur Goldbretter + Cherubimdecke), und die Innen-Deckenplane bleibt
  // hinter den Balken (w < Balken-Aussenkante 4,62).
  const layers = [
    { w: 4.4, t: 0.03, back: 45.3, y: 4.515, mat: BYSSUS_CHERUBIM, inner: true },
    { w: 5.35, t: 0.04, back: 45.6, y: 4.56, mat: GOAT_HAIR, inner: false },
    { w: 5.8, t: 0.04, back: 45.9, y: 4.61, mat: RAM_SKIN, inner: false },
    { w: 6.25, t: 0.05, back: 46.2, y: 4.66, mat: TACHASH, inner: false },
  ];
  const goatHair = layers[1];
  const ropeZs = Array.from({ length: 5 }, (_, i) => 32 + i * 3.25);

  // Unterperspektive der Byssus-Schicht: EINE texturierte Plane
  // (4-farbige Querstreifen + goldene Cherubim-Andeutungen)
  const underRoof = layers[0];
  const underFront = TENT_Z_START - frontOverhang;
  const underLen = underRoof.back - underFront;
  const underW = 4.46; // bleibt hinter den Balken-Aussenkanten (±2,31)

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
            {/* Hinten hängt der Vorhang herunter (halbe Decke, Ex 26,9.12-13)
                — NUR die Aussen-Schichten b/c/d; Schicht a ist Innendecke (A3) */}
            {!l.inner && (
              <mesh position={[0, 3.35, l.back - 0.02]} material={l.mat}>
                <planeGeometry args={[l.w, 2.3]} />
              </mesh>
            )}

            {/* Unterseite der Byssus-Schicht (Innenansicht): 1 texturierte Plane */}
            {i === 0 && (
              <mesh
                position={[0, l.y - l.t / 2 - 0.001, underFront + underLen / 2]}
                rotation={[Math.PI / 2, 0, 0]}
                material={l.mat}
              >
                <planeGeometry args={[underW, underLen]} />
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
// (mandelförmiger Schwung der Menora-Arme, Ex 25,31-36) — in menoraGoldGeo
// eingebacken (P1 Merge), hier nur noch die animierten Flammen-Ebenen.

function Menora({ position }: { position: Vec3 }) {
  // 2. Mose 25,31-40 - ein Talent Gold, ~1 Elle (≈1m) hoch
  // 7 Arme (3 Paare + Mittelschaft), Mandelblüten-Knäufe, Öllämpchen mit Flammen
  // Flammen-Animation: y-Scale +-15%, Phasen versetzt (keine Allokation pro Frame)
  const flameRefs = useRef<(THREE.Group | null)[]>([]);
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
  const lampXs = [0, ...MENORA_PAIRS.map((p) => p.lampX * -1), ...MENORA_PAIRS.map((p) => p.lampX)];

  return (
    <group position={position}>
      {/* Gesamte GOLD-Struktur (Fuss, Schaft, Arme, Knaeufe, Laempchen,
          Geraete) als EINE gemergte Geometrie (P1 Draw-Call-Merge) */}
      <mesh position={[0, 0, 0]} geometry={menoraGoldGeo} material={GOLD} castShadow />

      {/* 7 Flammen als 2 gekreuzte, leicht transparente Ebenen (B1),
          EIN geteiltes FLAME-Material, animiert */}
      {lampXs.map((x, i) => (
        <group key={`flame-${i}`} position={[x, MENORA_LAMP_Y, 0]}>
          <group ref={(g) => { flameRefs.current[i] = g; }} position={[0, 0.055, 0]}>
            <mesh geometry={flamePlaneGeo} material={FLAME} />
            <mesh geometry={flamePlaneGeo} material={FLAME} rotation={[0, Math.PI / 2, 0]} />
          </group>
        </group>
      ))}

      {/* Flackerndes Licht der Menora lebt in TabernacleLighting (kein Duplikat) */}
    </group>
  );
}

function ShowbreadTable({ position }: { position: Vec3 }) {
  // 2. Mose 25,23-30 - 2 x 1 x 1,5 Ellen (0,9 x 0,45 x 0,675m), Akazien mit Gold überzogen
  // 12 Schaubrote: 2 Stapel à 6 (Ex 25,30 / 3. Mose 24,5-9) als InstancedMesh
  const loaves: InstanceTransform[] = [];
  for (const stackX of [-0.2, 0.2]) {
    for (let j = 0; j < 6; j++) {
      loaves.push({
        position: [stackX, TABLE_TOP_Y + 0.045 + j * 0.042, 0],
        rotation: [0, j % 2 === 0 ? 0.12 : -0.12, 0],
      });
    }
  }

  return (
    <group position={position}>
      {/* Platte + Doppelskranz + Beine + Ringfuesse + Eckenringe +
          Tragstangen + Geraete: EINE gemergte GOLD-Geometrie (P1 Merge) */}
      <mesh geometry={tableGoldGeo} material={GOLD} castShadow />

      {/* Schaubrote: 2 Stapel à 6 - instanziert */}
      <Instanced geometry={loavesGeo} material={BREAD} transforms={loaves} />
    </group>
  );
}

function IncenseAltar({ position }: { position: Vec3 }) {
  // 2. Mose 30,1-10 - 1 x 1 x 2 Ellen, Akazien mit Gold überzogen, 4 Hörner,
  // steht direkt vor dem Vorhang des Allerheiligsten
  return (
    <group position={position}>
      {/* Korpus + Kranzleiste + 4 Hoerner + Ringe: EINE gemergte
          GOLD-Geometrie (P1 Merge, grosse Silhouette) */}
      <mesh geometry={incenseGoldGeo} material={GOLD} castShadow />

      {/* Glühende Räucherkohle - eigene emissive Instanz */}
      <mesh position={[0, INCENSE_HEIGHT + 0.045, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
        <meshStandardMaterial color={0xFF5522} emissive={0xCC3300} emissiveIntensity={2.2} />
      </mesh>

      {/* Tragstangen (Akazien) - gemergt (P1) */}
      <mesh geometry={incenseStavesGeo} material={ACACIA_WOOD} />

      {/* Räucherhauch + warmes Kohlenlicht (kein Schatten) */}
      <mesh position={[0, INCENSE_HEIGHT + 0.3, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={0xFFFFFF} transparent opacity={0.07} />
      </mesh>
      <pointLight position={[0, INCENSE_HEIGHT + 0.2, 0]} intensity={0.5} color={0xFF8833} distance={4} decay={2} />
    </group>
  );
}
