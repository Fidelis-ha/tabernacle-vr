import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURTYARD_Z_CENTER } from './TabernacleFloor';
import { Instanced, ropeTransform, type InstanceTransform, type Vec3 } from '../utils/instancing';
import { goatHairTexture, smokeTexture } from '../utils/textures';
import { ROPE, ACACIA_WOOD } from '../utils/materials';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';

// Camp Israel — deutbare Zutat nach 4. Mose 2, nicht Teil der Exodus-Spezifikation.
// SPEC C — Wuestenzelte der Bronzezeit (KEINE Pyramiden-Silhouette mehr):
// - Flaches, langgezogenes Prismen-Flachdach (Hauptform) mit ueberstehendem
//   Dachueberhang + seitlich herabhaengender Planen-Saum (bis ~0,3 m ueber Boden)
// - 2 zentrale Stuetzstangen, ragen oben leicht heraus
// - 4 Abspannseile je Zelt (Dachkante -> Boden) mit Zeltpflock-Kegeln
// - Dunkle Eingangs-Oeffnung an einer Giebelseite (halbtransparent dunkel)
// - Ziegenhaar-Stoff (goatHairTexture wiederverwendet) in 3 Farbvarianten
//   (0x9A7A58-Basis + abgedunkelt/aufgehellt) mit versetzter Naht-Textur
// Nur 20% kleine flache Herdenzelte (Kegel r=1,8 / h=1,1).
// 5->3 Rauchsaeulen (low-Tier). InstancedMesh, < 15 Draw Calls.
// KEINE Menschengestalten.

const CENTER_Z = COURTYARD_Z_CENTER; // 22,5 — Ring um die Vorhof-Mitte
const TENT_COUNT = 52;

// Deterministischer Zufall (stabile Anordnung über Reloads)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TentSpec {
  x: number;
  z: number;
  rotY: number;
  scale: number;
  herd: boolean; // kleines flaches Herdenzelt (Kegel) statt Wohnzelt-Prisma
}

// Einheitstent (s=1) — Masse in Metern, per Instanz skaliert
export const TENT_EAVE = 0.85;      // Traufhoeke
export const TENT_RIDGE = 1.45;     // Firsthoehe
export const TENT_HALF_W = 1.2;     // halbe Leibungsbreite (Saum bei x=±1,2)
export const TENT_HALF_L = 1.8;     // halbe Leibungslaenge

function generateTents(): TentSpec[] {
  const rand = mulberry32(40277);
  const tents: TentSpec[] = [];
  for (let i = 0; i < TENT_COUNT; i++) {
    // Ringwinkel: Osten (Richtung z = 0, also d.z < 0) bleibt als Keil frei
    const angle = rand() * Math.PI * 2;
    const dir = { x: Math.sin(angle), z: Math.cos(angle) };
    if (dir.z < -0.7) continue; // Ostkeil frei (schmaler, Platz des Volkes)
    const radius = 25 + rand() * 15; // 25-40 m um die Vorhof-Mitte
    tents.push({
      x: dir.x * radius + (rand() - 0.5) * 4,
      z: CENTER_Z + dir.z * radius + (rand() - 0.5) * 4,
      rotY: rand() * Math.PI * 2,
      scale: 1.1 + rand() * 0.5,
      herd: rand() < 0.2, // SPEC C: nur 20% kleine Herdenzelte
    });
  }
  return tents;
}

// Modul-Daten (einmalige Erzeugung, von Animals.tsx als Positions-Anker nutzbar)
export const TENT_SPECS = generateTents();

// --- Einheits-Prisma (SPEC C: Flachdach-Hauptform) ---
// Dreiecksquerschnitt (Halbbreite 1, Firsthoehe 1), Halblaenge 1 entlang z.
// Skalierung pro Zelt: [1,45*s, 0,7*s, 2,05*s] -> ueberstehender Ueberhang.
function makeTentRoofGeo(): THREE.BufferGeometry {
  const A = [-1, 0, -1], B = [1, 0, -1], C = [0, 1, -1];
  const A2 = [-1, 0, 1], B2 = [1, 0, 1], C2 = [0, 1, 1];
  const tris = [
    A, C, C2,  A, C2, A2,   // linke Dachflaeche
    B, B2, C2,  B, C2, C,   // rechte Dachflaeche
    A, B, C,                // Giebel vorn
    B2, A2, C2,             // Giebel hinten
    A, A2, B2,  A, B2, B,   // Unterseite (Ueberhang von unten sichtbar)
  ];
  const pos: number[] = [];
  const uvs: number[] = [];
  for (const v of tris) {
    pos.push(v[0], v[1], v[2]);
    uvs.push((v[0] + v[2]) * 0.7, (v[1] + v[2]) * 0.7);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

// Modul-Geometrien (Budget-Regel 8)
const roofGeo = makeTentRoofGeo();
const skirtGeo = new THREE.BoxGeometry(0.04, 1, 1);            // herabhaengender Saum
const poleGeo = new THREE.CylinderGeometry(0.035, 0.04, 1, 6); // Stuetzstange
const guyRopeGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5); // Abspannseil
const pegGeo = new THREE.ConeGeometry(0.032, 0.3, 6);          // Zeltpflock
const doorGeo = new THREE.PlaneGeometry(0.7, 0.95);            // Eingangs-Oeffnung
const herdGeo = new THREE.ConeGeometry(1.8, 1.1, 7);           // Herdenzelt (flach)

// Ziegenhaar-Stoff (SPEC C): goatHairTexture wiederverwendet, 3 Farbvarianten
// (0x9A7A58-Basis, abgedunkelt, aufgehellt) — Material-Budget: genau 3 Instanzen.
// Naht-Streifen via Textur-Offset versetzt (geklonte CanvasTexture, selbes Bild).
function makeTentMaterial(color: number, offsetU: number): THREE.MeshLambertMaterial {
  const map = offsetU === 0 ? goatHairTexture : goatHairTexture.clone();
  if (offsetU !== 0) {
    map.offset.set(offsetU, 0);
    map.needsUpdate = true;
  }
  return new THREE.MeshLambertMaterial({ color, map, side: THREE.DoubleSide });
}
const tentMatA = makeTentMaterial(0x9A7A58, 0);      // Basis
const tentMatB = makeTentMaterial(0x7A6244, 0.37);   // abgedunkelt, Naht versetzt
const tentMatC = makeTentMaterial(0xB29268, 0.71);   // aufgehellt, Naht versetzt
const tentMats = [tentMatA, tentMatB, tentMatC];

// Rauchpositionen bei Zeltgruppen (low-Tier: nur die ersten 3)
const SMOKE_POSITIONS: Vec3[] = [
  [-30, 0.6, 8],
  [28, 0.6, 12],
  [-26, 0.6, 38],
  [30, 0.6, 36],
  [0, 0.6, 60],
];

// Hilfsfunktion: lokalen Punkt (x, z) um rotY drehen + Zelt verschieben
function rotateOffset(x: number, z: number, rotY: number): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [x * c + z * s, -x * s + z * c];
}

export function CampIsrael() {
  const tents = TENT_SPECS;
  const smokeGroup = useRef<THREE.Group>(null);
  const smokeCount = QUALITY_SETTINGS[detectQuality()].smokeColumns;

  // Zelt-Bauteile sammeln (einmalig, deterministisch)
  const parts = useMemo(() => {
    const roofs: InstanceTransform[][] = [[], [], []];
    const skirts: InstanceTransform[][] = [[], [], []];
    const poles: InstanceTransform[] = [];
    const ropes: InstanceTransform[] = [];
    const pegs: InstanceTransform[] = [];
    const doors: InstanceTransform[] = [];
    const herd: InstanceTransform[] = [];

    const ridgeH = TENT_RIDGE - (TENT_EAVE - 0.1); // Prismen-Bauhoehe 0,7
    tents.forEach((t, i) => {
      if (t.herd) {
        // Kleines flaches Herdenzelt (Kegel r=1,8 / h=1,1, SPEC C)
        herd.push({ position: [t.x, 0.55 * t.scale, t.z], rotation: [0, t.rotY, 0], scale: t.scale });
        return;
      }
      const v = i % 3; // Stoff-Variante
      const s = t.scale;
      roofs[v].push({
        position: [t.x, (TENT_EAVE - 0.1 + ridgeH / 2) * s, t.z],
        rotation: [0, t.rotY, 0],
        scale: [1.45 * s, 0.7 * s, 2.05 * s],
      });
      // Saum: an beiden Langseiten von der Traufe bis ~0,3 m ueber Boden
      for (const side of [-1, 1]) {
        const [ox, oz] = rotateOffset(side * TENT_HALF_W, 0, t.rotY);
        skirts[v].push({
          position: [t.x + ox * s, ((TENT_EAVE + 0.3) / 2) * s, t.z + oz * s],
          rotation: [0, t.rotY, 0],
          scale: [s, (TENT_EAVE - 0.3) * s, TENT_HALF_L * 2 * s],
        });
      }
      // 2 zentrale Stuetzstangen, ragen oben leicht heraus
      for (const pz of [-0.8, 0.8]) {
        const [ox, oz] = rotateOffset(0, pz, t.rotY);
        poles.push({
          position: [t.x + ox * s, (TENT_RIDGE * s) / 2, t.z + oz * s],
          rotation: [0, t.rotY, 0],
          scale: [1, TENT_RIDGE * s + 0.12, 1],
        });
      }
      // 4 Abspannseile von der Dachkante schraeg zum Boden + Pflloecke
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const [sxw, szw] = rotateOffset(sx * 1.35, sz * 1.95, t.rotY);
          const [exw, ezw] = rotateOffset(sx * 2.25, sz * 2.9, t.rotY);
          ropes.push(
            ropeTransform(
              [t.x + sxw * s, 0.8 * s, t.z + szw * s],
              [t.x + exw * s, 0.02, t.z + ezw * s]
            )
          );
          pegs.push({
            position: [t.x + exw * s, 0.11 * s + 0.02, t.z + ezw * s],
            rotation: [0.12 * sx, 0, 0.12 * sz],
            scale: s,
          });
        }
      }
      // Dunkle Eingangs-Oeffnung an der vorderen Giebelseite
      const [dx, dz] = rotateOffset(0, -(TENT_HALF_L + 0.02), t.rotY);
      doors.push({
        position: [t.x + dx * s, 0.6 * s, t.z + dz * s],
        rotation: [0, t.rotY, 0],
        scale: s,
      });
    });

    return { roofs, skirts, poles, ropes, pegs, doors, herd };
  }, []);

  // Rauch: aufsteigend, transparent, langsam driftend (3-5 Sprites)
  useFrame((state) => {
    const group = smokeGroup.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < group.children.length; i++) {
      const s = group.children[i] as THREE.Sprite;
      const phase = (t * 0.12 + i * 0.31) % 1;
      s.position.y = 0.6 + phase * 3.4;
      s.position.x = SMOKE_POSITIONS[i][0] + Math.sin(t * 0.25 + i * 1.7) * 0.5;
      s.material.opacity = 0.42 * Math.sin(phase * Math.PI);
    }
  });

  return (
    <group>
      {/* Prismen-Dach, 3 Stoff-Varianten (3 InstancedMeshes) */}
      {parts.roofs.map((batch, v) => (
        <Instanced key={`roof-${v}`} geometry={roofGeo} material={tentMats[v]} transforms={batch} />
      ))}

      {/* Herabhaengender Saum, je Stoff-Variante (3 InstancedMeshes) */}
      {parts.skirts.map((batch, v) => (
        <Instanced key={`skirt-${v}`} geometry={skirtGeo} material={tentMats[v]} transforms={batch} />
      ))}

      {/* Stuetzstangen + Abspannseile + Zeltpflloecke (je 1 InstancedMesh) */}
      <Instanced geometry={poleGeo} material={ACACIA_WOOD} transforms={parts.poles} />
      <Instanced geometry={guyRopeGeo} material={ROPE} transforms={parts.ropes} />
      <Instanced geometry={pegGeo} material={ACACIA_WOOD} transforms={parts.pegs} />

      {/* Dunkle Eingangs-Oeffnungen (dunkle Stoffvariante liest sich als
          Oeffnung; halbtransparent wuerde ein 4. Material kosten) */}
      <Instanced geometry={doorGeo} material={tentMatB} transforms={parts.doors} />

      {/* Kleine Herdenzelte (20%, flache Kegel) */}
      <Instanced geometry={herdGeo} material={tentMatC} transforms={parts.herd} />

      {/* 3-5 Rauchsäulen — eigenes Material pro Sprite (Opacity animiert) */}
      <group ref={smokeGroup}>
        {SMOKE_POSITIONS.slice(0, smokeCount).map((p, i) => (
          <sprite key={`smoke-${i}`} position={p} scale={[2.4, 3.6, 1]}>
            <spriteMaterial
              map={smokeTexture}
              transparent
              depthWrite={false}
              opacity={0.2}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}
