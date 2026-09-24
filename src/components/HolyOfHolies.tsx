import * as THREE from 'three';
import {
  CUBIT,
  TENT_WIDTH,
  TENT_HEIGHT,
  HOLY_OF_HOLIES_Z_START,
  HOLY_OF_HOLIES_Z_END,
} from './TabernacleFloor';
import { SideBeamWall, HOLY_WALL_SPLIT_Z } from './HolyPlace';
import { GOLD, SILVER, VEIL_MAT } from '../utils/materials';
import { goldTexture, goldRoughTexture } from '../utils/textures';
import { Instanced, type InstanceTransform, type Vec3 } from '../utils/instancing';
import { mergeParts, type MergePart } from '../utils/merge';

// Allerheiligstes nach Ex 25,10-22 / 26,31-34 / SPEC:
// Würfel 4,5 x 4,5 x 4,5m (10 Ellen), z = 40,5 ... 45
// Wände wie die Stiftshütte: goldüberzogene Akazienbalken
// (Westwand nach Ex 26,22-25: 6 Balken + 2 L-förmige Eckbalken = 8, 16 Silbersockel)
// Vorhang (Parochet): 4 Farben mit Cherubim-Wirkerei als Canvas-Textur,
// an 4 goldenen Säulen auf 4 Silbersockeln (Ex 26,32) bei z = 40,5
// Lade: 2,5 x 1,5 x 1,5 Ellen, 4 Ringe an den UNTEREN Ecken, Tragstangen,
// massiv goldene Kapporet, grosse Cherubim mit ausgebreiteten Flügeln (~1 Elle hoch)

const HALF_W = TENT_WIDTH / 2; // 2,25m
const VEIL_Z = HOLY_OF_HOLIES_Z_START; // 40,5

// Modul-Geometrien (Budget-Regel 8)
const westBoardGeo = new THREE.BoxGeometry(1, TENT_HEIGHT - 0.2, 0.12); // Breite via scale
const westSocketGeo = new THREE.BoxGeometry(0.2, 0.2, 0.28);
const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
const veilPedestalGeo = new THREE.BoxGeometry(0.28, 0.2, 0.28);
const veilShaftGeo = new THREE.CylinderGeometry(0.045, 0.055, TENT_HEIGHT, 10);
const veilCapGeo = new THREE.CylinderGeometry(0.065, 0.04, 0.12, 10);

// Lade-Ringe (B5: sichtbarer Ring-Ausschnitt — 3/4-Torus, die Tragstange
// tritt durch die Oeffnung) + Kronen-Torus am oberen Rand (elliptisch
// skaliert auf den Laderand)
const arkRingGeo = new THREE.TorusGeometry(0.055, 0.018, 6, 12, Math.PI * 1.5);
const arkRingSocketGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.022, 8); // dunkle Fassung im Ring
const arkCrownGeo = new THREE.TorusGeometry(1, 0.022, 6, 36);
// 2 schmale Stufungsringe (Re-Review: staerker profiliert — dickere Welle,
// groessere Segmentierung fuer lesbarere gedrechselte Silhouette)
const arkCrownStepGeo = new THREE.TorusGeometry(1, 0.02, 10, 48);

// Lade-Doppellage (SPEC A): untere Lage etwas dunkler patiniert
// (Holz unter Gold ablesbar), dunkle Akzent-Fuge als Geometrie-Streifen
const ARK_GOLD_LOWER = new THREE.MeshStandardMaterial({
  color: 0xA8842C,
  metalness: 1.0,
  roughness: 0.55,
  roughnessMap: goldRoughTexture,
  envMapIntensity: 0.8,
  bumpMap: goldTexture,
  bumpScale: 0.06,
});
const ARK_SEAM = new THREE.MeshStandardMaterial({ color: 0x3A2A14, roughness: 0.9 });

// === P1 Draw-Call-Merge: Lade + Cherubim als 3 gemergte Geometrien
// (GOLD / untere dunkle Lage / Naht) statt ~40 Einzel-Meshes ===

// Lade-Masse (Ex 25,10): 2,5 x 1,5 x 1,5 Ellen
const ARK_LENGTH = 2.5 * CUBIT; // 1,125m
const ARK_WIDTH = 1.5 * CUBIT;  // 0,675m
const ARK_HEIGHT = 1.5 * CUBIT; // 0,675m
const ARK_FOOT_H = 0.06;
const ARK_KAPORET_Y = ARK_FOOT_H + ARK_HEIGHT + 0.045;
// Doppellage (SPEC A): untere Lage etwas dunkler patiniert, Fugen-Naht dazwischen
const ARK_LOWER_H = ARK_HEIGHT * 0.55;
const ARK_SEAM_H = 0.012;
const ARK_UPPER_H = ARK_HEIGHT - ARK_LOWER_H;
const ARK_UPPER_Y = ARK_FOOT_H + ARK_LOWER_H + ARK_SEAM_H + ARK_UPPER_H / 2;

// 4 goldene Ringe an den 4 UNTEREN Ecken (Ex 25,12)
const ARK_RING_POSITIONS: Vec3[] = [
  [-ARK_LENGTH / 2 + 0.08, ARK_FOOT_H + 0.12, ARK_WIDTH / 2 + 0.035],
  [ARK_LENGTH / 2 - 0.08, ARK_FOOT_H + 0.12, ARK_WIDTH / 2 + 0.035],
  [-ARK_LENGTH / 2 + 0.08, ARK_FOOT_H + 0.12, -ARK_WIDTH / 2 - 0.035],
  [ARK_LENGTH / 2 - 0.08, ARK_FOOT_H + 0.12, -ARK_WIDTH / 2 - 0.035],
];

const arkStaveGeo = new THREE.CylinderGeometry(0.03, 0.03, ARK_LENGTH + 0.7, 8);
// P2 Lade-Relief: duenne Gold-Reliefleisten (Muster wie die Fugen-Naht,
// aber hervortretend — Ladung/Last ablesbar)
const arkReliefStripGeo = new THREE.BoxGeometry(ARK_LENGTH + 0.014, 0.016, ARK_WIDTH + 0.014);
// P2 Cherubim-Fluegel: Kerb-Streifen als Feder-Andeutung
const arkWingNotchGeo = new THREE.BoxGeometry(0.016, 0.01, 0.26);

// Cherubim-Bauteile (Ex 25,18-20), lokal; unverändert aus der bisherigen
// Cherub-Komponente uebernommen
const CHERUB_INNER_WING = 0.56;
const CHERUB_OUTER_WING = 0.55;
const CHERUB_INNER_ANGLE = THREE.MathUtils.degToRad(60);
const CHERUB_OUTER_ANGLE = THREE.MathUtils.degToRad(50);
const cherubFootGeo = new THREE.SphereGeometry(0.022, 8, 8);
const cherubBodyGeo = new THREE.CylinderGeometry(0.07, 0.11, 0.36, 10);
const cherubHeadGeo = new THREE.SphereGeometry(0.06, 10, 10);
const cherubInnerWingGeo = new THREE.BoxGeometry(CHERUB_INNER_WING, 0.014, 0.3);
const cherubOuterWingGeo = new THREE.BoxGeometry(CHERUB_OUTER_WING, 0.014, 0.3);
const cherubMiddleGeo = new THREE.BoxGeometry(0.14, 0.013, 0.28);
const cherubFeatherInnerGeo = new THREE.BoxGeometry(CHERUB_INNER_WING * 0.85, 0.012, 0.2);
const cherubFeatherOuterGeo = new THREE.BoxGeometry(CHERUB_OUTER_WING * 0.85, 0.012, 0.2);

// Kerb-Streifen quer ueber eine Fluegel-Flaeche (Feder-Andeutung, P2)
function wingNotches(
  ctrX: number,
  ctrY: number,
  rot: number,
  wingLen: number,
  cx: number,
  baseY: number
): MergePart[] {
  const ax = Math.cos(rot);
  const ay = Math.sin(rot);
  const nx = -Math.sin(rot);
  const ny = Math.cos(rot);
  const up = ny >= 0 ? 1 : -1; // Normale kann bei Rot > 90° nach unten zeigen
  const parts: MergePart[] = [];
  for (const t of [-wingLen * 0.2, wingLen * 0.2]) {
    parts.push({
      geo: arkWingNotchGeo,
      p: [cx + ctrX + ax * t + nx * up * 0.012, baseY + ctrY + ay * t + ny * up * 0.012, 0],
      r: [0, 0, rot],
    });
  }
  return parts;
}

function cherubParts(facing: 1 | -1, cx: number, baseY: number): MergePart[] {
  // Innerer Flügel: Wurzel an der inneren Körperkante, steil zur Mitte
  // (Spitzen übereinander in der Mitte, Ex 25,20); äusserer Flügel zur Wand
  const innerCenterX = facing * (0.06 + (CHERUB_INNER_WING / 2) * Math.cos(CHERUB_INNER_ANGLE));
  const innerCenterY = 0.32 + (CHERUB_INNER_WING / 2) * Math.sin(CHERUB_INNER_ANGLE);
  const outerCenterX = -facing * (0.08 + (CHERUB_OUTER_WING / 2) * Math.cos(CHERUB_OUTER_ANGLE));
  const outerCenterY = 0.38 + (CHERUB_OUTER_WING / 2) * Math.sin(CHERUB_OUTER_ANGLE);
  const innerRotation = Math.PI / 2 - facing * (Math.PI / 2 - CHERUB_INNER_ANGLE);
  const outerRotation = Math.PI / 2 + facing * (Math.PI / 2 - CHERUB_OUTER_ANGLE);
  const off = (p: Vec3): Vec3 => [p[0] + cx, p[1] + baseY, p[2]];

  const parts: MergePart[] = [
    { geo: cherubFootGeo, p: off([-0.05, 0.012, 0]) },
    { geo: cherubFootGeo, p: off([0.05, 0.012, 0]) },
    { geo: cherubBodyGeo, p: off([facing * 0.015, 0.18, 0]), r: [0, 0, -facing * 0.09] },
    { geo: cherubHeadGeo, p: off([facing * 0.03, 0.405, 0]), r: [0, 0, -facing * 0.35] },
    { geo: cherubInnerWingGeo, p: off([innerCenterX, innerCenterY, 0]), r: [0, 0, innerRotation] },
    { geo: cherubOuterWingGeo, p: off([outerCenterX, outerCenterY, 0]), r: [0, 0, outerRotation] },
    { geo: cherubFeatherInnerGeo, p: off([innerCenterX, innerCenterY - 0.035, 0.02]), r: [0.06, 0, innerRotation + facing * 0.14] },
    { geo: cherubFeatherOuterGeo, p: off([outerCenterX, outerCenterY - 0.035, 0.02]), r: [-0.06, 0, outerRotation - facing * 0.12] },
    ...wingNotches(innerCenterX, innerCenterY, innerRotation, CHERUB_INNER_WING, cx, baseY),
    ...wingNotches(outerCenterX, outerCenterY, outerRotation, CHERUB_OUTER_WING, cx, baseY),
  ];
  // Mittelstück über x=0 verbindet die Flügel-Spitzen (nur 1x, Ex 25,20)
  if (facing === 1) {
    parts.push({ geo: cherubMiddleGeo, p: off([0, innerCenterY, 0]), r: [0, 0, CHERUB_INNER_ANGLE] });
  }
  return parts;
}

const arkGoldGeo: THREE.BufferGeometry = (() => {
  const parts: MergePart[] = [
    // obere Korpus-Lage (GOLD)
    { geo: new THREE.BoxGeometry(ARK_LENGTH, ARK_UPPER_H, ARK_WIDTH), p: [0, ARK_UPPER_Y, 0] },
    // P2 Reliefleisten obere Lage (3)
    { geo: arkReliefStripGeo, p: [0, 0.5, 0] },
    { geo: arkReliefStripGeo, p: [0, 0.575, 0] },
    { geo: arkReliefStripGeo, p: [0, 0.65, 0] },
    // Goldene Krönung am oberen Rand
    { geo: new THREE.BoxGeometry(ARK_LENGTH + 0.05, 0.05, ARK_WIDTH + 0.05), p: [0, ARK_FOOT_H + ARK_HEIGHT - 0.03, 0] },
    // Goldkranz als gedrechselte WELLE (SPEC A): Haupt-Torus + 2 Stufungsringe
    { geo: arkCrownGeo, p: [0, ARK_FOOT_H + ARK_HEIGHT + 0.008, 0], r: [Math.PI / 2, 0, 0], s: [ARK_LENGTH / 2 + 0.03, ARK_WIDTH / 2 + 0.03, 1] },
    { geo: arkCrownStepGeo, p: [0, ARK_FOOT_H + ARK_HEIGHT + 0.026, 0], r: [Math.PI / 2, 0, 0], s: [ARK_LENGTH / 2 + 0.018, ARK_WIDTH / 2 + 0.018, 1] },
    { geo: arkCrownStepGeo, p: [0, ARK_FOOT_H + ARK_HEIGHT - 0.012, 0], r: [Math.PI / 2, 0, 0], s: [ARK_LENGTH / 2 + 0.042, ARK_WIDTH / 2 + 0.042, 1] },
    // Tragstangen (Ex 25,13-15), bleiben eingesteckt
    { geo: arkStaveGeo, p: [0, ARK_FOOT_H + 0.12, ARK_WIDTH / 2 + 0.035], r: [0, 0, Math.PI / 2] },
    { geo: arkStaveGeo, p: [0, ARK_FOOT_H + 0.12, -ARK_WIDTH / 2 - 0.035], r: [0, 0, Math.PI / 2] },
    // Kapporet (Ex 25,17) + abschliessender Rand
    { geo: new THREE.BoxGeometry(ARK_LENGTH + 0.1, 0.09, ARK_WIDTH + 0.1), p: [0, ARK_KAPORET_Y, 0] },
    { geo: arkCrownStepGeo, p: [0, ARK_KAPORET_Y + 0.045, 0], r: [Math.PI / 2, 0, 0], s: [ARK_LENGTH / 2 + 0.05, ARK_WIDTH / 2 + 0.05, 1] },
    // 2 grosse Cherubim (Ex 25,19)
    ...cherubParts(1, -0.32, ARK_KAPORET_Y + 0.045),
    ...cherubParts(-1, 0.32, ARK_KAPORET_Y + 0.045),
  ];
  // 4 Ringe: 3/4-Torus-Oesen
  ARK_RING_POSITIONS.forEach((pos, i) => {
    parts.push({ geo: arkRingGeo, p: pos, r: [0, Math.PI / 2, i * Math.PI] });
  });
  return mergeParts(parts);
})();

const arkLowerGeo: THREE.BufferGeometry = mergeParts([
  // untere Korpus-Lage (SPEC A: dunkler patiniert)
  { geo: new THREE.BoxGeometry(ARK_LENGTH, ARK_LOWER_H, ARK_WIDTH), p: [0, ARK_FOOT_H + ARK_LOWER_H / 2, 0] },
  // P2 Reliefleisten untere Lage (2)
  { geo: arkReliefStripGeo, p: [0, 0.17, 0] },
  { geo: arkReliefStripGeo, p: [0, 0.31, 0] },
]);

const arkSeamGeo: THREE.BufferGeometry = mergeParts([
  // Sichtbare horizontale Fugen-Naht rund um den Korpus
  { geo: new THREE.BoxGeometry(ARK_LENGTH + 0.004, ARK_SEAM_H, ARK_WIDTH + 0.004), p: [0, ARK_FOOT_H + ARK_LOWER_H + ARK_SEAM_H / 2, 0] },
  // Dunkle Fassungen in den Ring-Oesen
  ...ARK_RING_POSITIONS.map(
    (pos, i) => ({ geo: arkRingSocketGeo, p: pos, r: [0, Math.PI / 2, i * Math.PI] } as MergePart)
  ),
]);

export function HolyOfHolies() {
  return (
    <group>
      {/* === GOLDÜBERZOGENE AKAZIENBALKEN (Allerheiligstes) === */}
      {/* Süd- & Nordseite, z = 40,275 ... 45 */}
      <SideBeamWall x={-HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      <SideBeamWall x={HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      {/* Westwand: 6 Balken + 2 L-förmige Eckbalken (Ex 26,22-25) */}
      <WestBeamWall />

      {/* === VORHANG (PAROCHET) auf 4 goldenen Säulen (Ex 26,31-33) === */}
      <VeilWithPillars />

      {/* === SCHEKINAH-HERRLICHKEIT über der Lade: Licht + Glow-Sprite +
           God-Rays-Fake leben in TabernacleLighting === */}

      {/* === BUNDESLADE (Ex 25,10-22) === */}
      <ArkOfCovenant position={[0, 0, HOLY_OF_HOLIES_Z_START + HALF_W]} />
    </group>
  );
}

function WestBeamWall() {
  // Westwand nach Ex 26,22-25: SECHS Balken über die innere Breite + ZWEI
  // L-förmige Eckbalken = 8 Balken, 16 Silbersockel (je 2 pro Balken)
  const count = 6;
  const spacing = TENT_WIDTH / count;
  const backZ = HOLY_OF_HOLIES_Z_END; // 45
  const plankLen = spacing * 0.93;
  // Ex 26,27-28: die MITTLERE der 5 Stangen läuft durch, die anderen 4 sind
  // halb so lang und treffen sich in der Mitte
  const barYs = [0.55, 1.4, TENT_HEIGHT / 2, 3.1, 3.95];

  const boards: InstanceTransform[] = [];
  const sockets: InstanceTransform[] = [];
  for (let i = 0; i < count; i++) {
    const x = -HALF_W + spacing * (i + 0.5);
    boards.push({ position: [x, TENT_HEIGHT / 2 + 0.2, backZ - 0.06], scale: [plankLen, 1, 1] });
    for (const dx of [-0.14, 0.14]) {
      sockets.push({ position: [x + dx, 0.1, backZ - 0.06] });
    }
  }

  // 5 Stangen entlang der Westwand (in x-Richtung)
  const bars: InstanceTransform[] = [];
  for (let bi = 0; bi < barYs.length; bi++) {
    const y = barYs[bi];
    if (bi === 2) {
      bars.push({
        position: [0, y, backZ - 0.12],
        rotation: [0, 0, Math.PI / 2],
        scale: [1, TENT_WIDTH, 1],
      });
    } else {
      for (const half of [-1, 1]) {
        bars.push({
          position: [half * (TENT_WIDTH / 4 + 0.015), y, backZ - 0.12],
          rotation: [0, 0, Math.PI / 2],
          scale: [1, TENT_WIDTH / 2, 1],
        });
      }
    }
  }

  return (
    <group>
      {/* Balken (grosse Silhouette) + Silbersockel (Ex 26,21) */}
      <Instanced geometry={westBoardGeo} material={GOLD} transforms={boards} castShadow receiveShadow />
      <Instanced geometry={westSocketGeo} material={SILVER} transforms={sockets} />
      <Instanced geometry={barGeo} material={GOLD} transforms={bars} />

      {/* 2 L-förmige Eckbalken (Ex 26,23-25 "doppelte Balken"): je ein Schenkel
          an der Westfläche, einer umgreift das Seitenwandende von aussen */}
      {[-1, 1].map((side) => (
        <group key={`corner-${side}`}>
          <mesh
            position={[side * (HALF_W + 0.03), TENT_HEIGHT / 2 + 0.2, backZ - 0.06]}
            material={GOLD}
            castShadow
          >
            <boxGeometry args={[0.3, TENT_HEIGHT - 0.2, 0.12]} />
          </mesh>
          <mesh
            position={[side * (HALF_W + 0.12), TENT_HEIGHT / 2 + 0.2, backZ - 0.28]}
            material={GOLD}
            castShadow
          >
            <boxGeometry args={[0.12, TENT_HEIGHT - 0.2, 0.5]} />
          </mesh>
          {/* Silbersockel unter den Eckbalken (je 2 pro Ecke) */}
          <mesh position={[side * (HALF_W + 0.03), 0.1, backZ - 0.06]} material={SILVER}>
            <boxGeometry args={[0.3, 0.2, 0.28]} />
          </mesh>
          <mesh position={[side * (HALF_W + 0.12), 0.1, backZ - 0.28]} material={SILVER}>
            <boxGeometry args={[0.28, 0.2, 0.36]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VeilWithPillars() {
  // 4-farbiger Vorhang mit Cherubim-Wirkerei (Canvas-Textur), an 4 goldenen
  // Säulen mit Silbersockeln (Ex 26,31-33)
  const veilH = TENT_HEIGHT - 0.05;
  const pillarXs = [-1.6875, -0.5625, 0.5625, 1.6875];

  const pedestals: InstanceTransform[] = [];
  const shafts: InstanceTransform[] = [];
  const caps: InstanceTransform[] = [];
  for (const x of pillarXs) {
    pedestals.push({ position: [x, 0.1, VEIL_Z + 0.06] });
    shafts.push({ position: [x, TENT_HEIGHT / 2 + 0.1, VEIL_Z + 0.06] });
    caps.push({ position: [x, TENT_HEIGHT + 0.16, VEIL_Z + 0.06] });
  }

  return (
    <group>
      <Instanced geometry={veilPedestalGeo} material={SILVER} transforms={pedestals} />
      <Instanced geometry={veilShaftGeo} material={GOLD} transforms={shafts} castShadow />
      <Instanced geometry={veilCapGeo} material={GOLD} transforms={caps} />

      {/* Vorhang: EINE Plane mit 4-Farben-Cherubim-Textur (Ex 26,31) */}
      <mesh position={[0, veilH / 2 + 0.05, VEIL_Z - 0.02]} material={VEIL_MAT}>
        <planeGeometry args={[TENT_WIDTH, veilH]} />
      </mesh>
    </group>
  );
}

function ArkOfCovenant({ position }: { position: Vec3 }) {
  // 2. Mose 25,10-22 - Lade + Cherubim: GOLD-Struktur, untere dunkle Lage
  // und Naht/Fassungen als je EINE gemergte Geometrie (P1 Draw-Call-Merge);
  // P2 Lade-Reliefleisten + Fluegel-Kerbstreifen sind eingebacken.
  return (
    <group position={[position[0], 0, position[2]]}>
      {/* GOLD: obere Lage, Kroenung, Goldkranz-Welle, Ringe, Tragstangen,
          Kapporet, beide Cherubim */}
      <mesh geometry={arkGoldGeo} material={GOLD} castShadow receiveShadow />
      {/* untere Lage (SPEC A, dunkler patiniert) + Reliefleisten */}
      <mesh geometry={arkLowerGeo} material={ARK_GOLD_LOWER} castShadow receiveShadow />
      {/* Fugen-Naht + Ring-Fassungen */}
      <mesh geometry={arkSeamGeo} material={ARK_SEAM} />
    </group>
  );
}
