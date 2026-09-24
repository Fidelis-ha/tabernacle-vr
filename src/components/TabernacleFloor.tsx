// Biblische Masse: 1 Elle = 0,45m (SPEC docs/SPEC-originalgetreue.md — NICHT angetastet)// Ziel-Layout: Ost (Eingang/Tor) = z = 0, West = z = +45m
// Vorhof: 100 x 50 Ellen (45m x 22,5m) - Ex 27,18, Wände 5 Ellen (2,25m)
// Stiftshütte im Vorhof am Westende: z = 31,5 ... 45m
//   Heiligen: z = 31,5 ... 40,5 (20 Ellen, 9m)
//   Allerheiligstes: z = 40,5 ... 45 (10 Ellen, 4,5m)
//   Breite 10 Ellen (4,5m), Höhe 10 Ellen (4,5m) - Ex 26,15-30

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EARTH, SAND } from '../utils/materials';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';

export const CUBIT = 0.45;

// Vorhof (Ex 27,9-19)
export const COURTYARD_WIDTH = 50 * CUBIT;   // 22,5m (x: -11,25 ... +11,25)
export const COURTYARD_LENGTH = 100 * CUBIT; // 45m (z: 0 ... 45)
export const COURTYARD_Z_CENTER = COURTYARD_LENGTH / 2; // 22,5
export const COURTYARD_WALL_HEIGHT = 5 * CUBIT;         // 2,25m
export const GATE_WIDTH = 20 * CUBIT;                   // 9m Tor an der Ostseite (z = 0)

// Stiftshütte (Ex 26,15-30)
export const TENT_WIDTH = 10 * CUBIT;   // 4,5m
export const TENT_HEIGHT = 10 * CUBIT;  // 4,5m
export const TENT_LENGTH = 30 * CUBIT;  // 13,5m
export const TENT_Z_START = 31.5;
export const TENT_Z_END = 45;
export const TENT_Z_CENTER = (TENT_Z_START + TENT_Z_END) / 2; // 38,25

// Heiligen (Ex 26 / 40)
export const HOLY_PLACE_SIZE = TENT_WIDTH;         // 4,5m Breite
export const HOLY_PLACE_Z_START = 31.5;
export const HOLY_PLACE_Z_END = 40.5;
export const HOLY_PLACE_Z_CENTER = 36;
export const MENORA_X = -1.1;   // Südseite (Ex 40,24)
export const TABLE_X = 1.1;     // Nordseite (Ex 40,22)
export const FURNITURE_Z = 36;
export const INCENSE_ALTAR_Z = 39.7; // direkt vor dem Vorhang (Ex 40,5)

// Allerheiligstes (Ex 25,10-22 / 26,31-34)
export const HOLY_OF_HOLIES_SIZE = 10 * CUBIT;     // 4,5m Würfel
export const HOLY_OF_HOLIES_Z_START = 40.5;
export const HOLY_OF_HOLIES_Z_END = 45;
export const HOLY_OF_HOLIES_Z_CENTER = 42.75;      // Mitte des Würfels

// Vorhof-Einrichtungen (Ex 40,6-7)
export const ALTAR_Z = 27;    // Brandopferaltar auf der Mittellinie
export const BASIN_Z = 29.5;  // Waschbecken zwischen Altar und Stiftshütte

// Deterministischer Zufall (stabile Unebenheit/Steinanordnung über Reloads)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sperrzonen (SPEC B): kein Stein unter Altar / Becken / Stiftshütte /
// Säulen-Reihen — Rechtecke x/z beim Platzieren abgefragt
const STONE_EXCLUSION: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
  { minX: -2.9, maxX: 2.9, minZ: 31.2, maxZ: 45.4 },    // Stiftshütte-Fundament
  { minX: -1.4, maxX: 1.4, minZ: 25.7, maxZ: 28.3 },    // Brandopferaltar
  { minX: -1.1, maxX: 1.1, minZ: 28.4, maxZ: 30.6 },    // Waschbecken
  { minX: -11.8, maxX: 11.8, minZ: -0.6, maxZ: 0.6 },   // Ostwand + Tor (Säulen)
  { minX: -11.8, maxX: 11.8, minZ: 44.7, maxZ: 45.6 },  // Westwand (Säulen)
  { minX: -11.9, maxX: -10.6, minZ: -0.5, maxZ: 45.5 }, // Süd-Reihe (Säulen)
  { minX: 10.6, maxX: 11.9, minZ: -0.5, maxZ: 45.5 },   // Nord-Reihe (Säulen)
];

function isExcluded(x: number, z: number): boolean {
  for (const e of STONE_EXCLUSION) {
    if (x > e.minX && x < e.maxX && z > e.minZ && z < e.maxZ) return true;
  }
  return false;
}

// Stein-Geometrien (SPEC B: Dodecahedron + abgeflachte Sphäre etc.,
// per Instanz flach gedrückt/rotiert)
const rockGeos = [
  new THREE.DodecahedronGeometry(0.14, 0),
  new THREE.SphereGeometry(0.13, 6, 5),
  new THREE.IcosahedronGeometry(0.11, 0),
  new THREE.TetrahedronGeometry(0.12, 0),
];

// Sand-Farben (SPEC B: 0xC9B18C bis 0x8A7355)
const ROCK_COLORS = [0xC9B18C, 0xB59E7A, 0xA08A66, 0x8A7355];

// Steine im Sand: EIN Material (weiss) + instanceColor — 4 InstancedMeshes,
// halb im Boden versenkt, kein castShadow (Budget)
function GroundStones() {
  const count = QUALITY_SETTINGS[detectQuality()].stones;
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
    []
  );

  const batches = useMemo(() => {
    const rand = mulberry32(9137);
    const perGeo: { matrix: THREE.Matrix4; color: THREE.Color }[][] = [[], [], [], []];
    const placed: { x: number; z: number }[] = [];
    // Gleichmaessige Ring-Abdeckung statt reiner Zufallsstreuung: Ringe im
    // Abstand ~0,9 m von 12 bis 22 m, je Ring Winkelschritte passend zum
    // Umfang (~0,9 m Bogenmass), Plus Jitter — Mindestabstand 0,9 m.
    const minDist = 0.9;
    for (let r = 12 + minDist / 2; r <= 22 && placed.length < count; r += minDist) {
      const n = Math.max(1, Math.round((2 * Math.PI * r) / minDist));
      for (let ai = 0; ai < n && placed.length < count; ai++) {
        const a = ((ai + (rand() - 0.5) * 0.5) / n) * Math.PI * 2;
        const rr = r + (rand() - 0.5) * 0.4;
        const x = Math.sin(a) * rr;
        const z = 22.5 + Math.cos(a) * rr;
        if (Math.cos(a) < -0.72 && rr < 16) continue; // Torbereich frei
        if (isExcluded(x, z)) continue;
        let tooClose = false;
        for (const p of placed) {
          if (Math.hypot(p.x - x, p.z - z) < minDist) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;
        placed.push({ x, z });
        const g = Math.floor(rand() * 4);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
        );
        const s = 0.5 + rand() * 1.1; // Grundgroesse, flach gedrueckt unten
        m.compose(
          new THREE.Vector3(x, 0.02 + s * 0.05, z),
          q,
          new THREE.Vector3(s, s * 0.55, s * (0.8 + rand() * 0.4))
        );
        const col = new THREE.Color(ROCK_COLORS[Math.floor(rand() * ROCK_COLORS.length)]);
        col.offsetHSL(0, 0, (rand() - 0.5) * 0.06);
        perGeo[g].push({ matrix: m, color: col });
      }
    }
    return perGeo;
  }, [count]);

  return (
    <group>
      {batches.map((batch, gi) => (
        <RockBatch key={`rocks-${gi}`} geometry={rockGeos[gi]} material={mat} batch={batch} />
      ))}
    </group>
  );
}

function RockBatch({
  geometry,
  material,
  batch,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  batch: { matrix: THREE.Matrix4; color: THREE.Color }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < batch.length; i++) {
      mesh.setMatrixAt(i, batch[i].matrix);
      mesh.setColorAt(i, batch[i].color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [batch]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(batch.length, 1)]}
      frustumCulled={false}
    />
  );
}

export function TabernacleFloor() {
  // Vorhof-Boden: 32x32 Segmente mit seeded Vertex-Displacement (SPEC B:
  // leichte Dellen und Huegel, Amplitude 3-6 cm)
  const courtyardGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(COURTYARD_WIDTH, COURTYARD_LENGTH, 32, 32);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const rand = mulberry32(511);
    const p1 = rand() * 10, p2 = rand() * 10, p3 = rand() * 10;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // 2-3 ueberlagerte Sinus-Wellen (seeded) + feines Rauschen, 3-6 cm
      const h =
        Math.sin(x * 0.5 + p1) * Math.cos(y * 0.33 + p2) * 0.022 +
        Math.sin((x + y) * 0.21 + p3) * 0.016 +
        (rand() - 0.5) * 0.01;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* Vorhof-Boden - feste Erde, z = 0 ... 45 (auch in der Stiftshütte,
          die Bibel kennt keinen Innenboden-Belag). Der Wüstensand um den
          Vorhof kommt als Dünen-Plane in Scene.tsx (1 Draw Call). */}
      <mesh
        geometry={courtyardGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, COURTYARD_Z_CENTER]}
        material={EARTH}
        receiveShadow
      />

      {/* Steine im Sand (SPEC B: 40-70 high / 20 low, halb versenkt,
          Sperrzonen respektiert, kein castShadow) */}
      <GroundStones />
    </group>
  );
}
