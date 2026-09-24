import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURTYARD_Z_CENTER } from './TabernacleFloor';
import { Instanced, ropeTransform, type InstanceTransform, type Vec3 } from '../utils/instancing';
import { burlapColorTexture, burlapNormalTexture, smokeTexture } from '../utils/textures';
import { ROPE, ACACIA_WOOD } from '../utils/materials';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';

// Camp Israel — deutbare Zutat nach 4. Mose 2, nicht Teil der Exodus-Spezifikation.
// SPEC C — Wuestenzelte der Bronzezeit (KEINE Pyramiden-Silhouette mehr):
// - Flaches, langgezogenes Prismen-Flachdach (Hauptform) mit ueberstehendem
//   Dachueberhang + seitlich herabhaengender Planen-Saum (bis ~0,3 m ueber Boden)
// - 2 zentrale Stuetzstangen, ragen oben leicht heraus
// - 4 Abspannseile je Zelt (Dachkante -> Boden) mit Zeltpflock-Kegeln
// - Dunkle Eingangs-Oeffnung an einer Giebelseite (halbtransparent dunkel)
// - Zeltstoff: CC0 fabric-burlap (ambientCG) in 3 Farbvarianten via color-Tinting
//   (0xB99A76-Basis + abgedunkelt/aufgehellt); Canvas-Ziegenhaar bleibt Fallback
// SPEC-perf-stoffe D: statische Stoff-Deformation (Sackung, Ecken-Knicke,
// gebackene Windwelle, 3 Geometrie-Varianten) + leichte Wind-Animation via
// onBeforeCompile (low-Tier ohne) + welliger Saum.
// Nur 20% kleine flache Herdenzelte (Kegel r=1,8 / h=1,1).
// 5->3 Rauchsaeulen (low-Tier). InstancedMesh, < 15 Draw Calls.
// KEINE Menschengestalten.

const CENTER_Z = COURTYARD_Z_CENTER; // 22,5 — Ring um die Vorhof-Mitte
const TENT_COUNT = 52;

// SPEC-marc-feedback2 A1: Sperrzone des VORHOFS (erweiterter Kasten, Puffer
// 5 m fuer Zeltbreite + Abspannseile). Ein Zelt-/Tier-Anker innerhalb
// |x| < 27 && z > -7 && z < 52 wird VERWORFEN (der Vorhof selbst ist
// 22,5 x 45 m: x ∈ [-11,25; 11,25], z ∈ [0; 45]).
export function inCourtyardKeepout(x: number, z: number): boolean {
  return Math.abs(x) < 27 && z > -7 && z < 52;
}

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
  // A1: verworfene Specs werden NEU gewürfelt (while + Abbruchzähler),
  // TENT_COUNT bleibt unverändert.
  let attempts = 0;
  const maxAttempts = TENT_COUNT * 200;
  while (tents.length < TENT_COUNT && attempts < maxAttempts) {
    attempts++;
    // Ringwinkel: Osten (Richtung z = 0, also d.z < 0) bleibt als Keil frei
    const angle = rand() * Math.PI * 2;
    const dir = { x: Math.sin(angle), z: Math.cos(angle) };
    if (dir.z < -0.7) continue; // Ostkeil frei (schmaler, Platz des Volkes)
    const radius = 25 + rand() * 15; // 25-40 m um die Vorhof-Mitte
    const x = dir.x * radius + (rand() - 0.5) * 4;
    const z = CENTER_Z + dir.z * radius + (rand() - 0.5) * 4;
    // A1: Vorhof-Sperrzone — nur AKZEPTIEREN, wenn AUSSERHALB
    // (|x| > 27 ODER z < -7 ODER z > 52), sonst neu würfeln
    if (inCourtyardKeepout(x, z)) continue;
    tents.push({
      x,
      z,
      rotY: rand() * Math.PI * 2,
      scale: 1.1 + rand() * 0.5,
      herd: rand() < 0.2, // SPEC C: nur 20% kleine Herdenzelte
    });
  }
  return tents;
}

// Modul-Daten (einmalige Erzeugung, von Animals.tsx als Positions-Anker nutzbar)
export const TENT_SPECS = generateTents();

// A3-Verifikation (Assert-artiger Check): KEIN TENT_SPECS-Eintrag innerhalb
// der Vorhof-Sperrzone — der Marc-Bug „Es steht ein Zelt in der Stiftshütte"
// ist damit ausgeschlossen (Vorhof x ∈ [-11,25; 11,25], z ∈ [0; 45] ⊂ Kasten).
for (const t of TENT_SPECS) {
  if (inCourtyardKeepout(t.x, t.z)) {
    console.error('[CampIsrael] ASSERT: Zelt im Vorhof-Sperrkasten!', t);
  }
}

// --- Einheits-Prisma (SPEC C: Flachdach-Hauptform) mit statischer
// Stoff-Deformation (SPEC-perf-stoffe D1):
// - 8x6 Segmente (statt 0)
// - Sackung: Sinus-Eindellung zwischen den Stuetzstangen (z = ±0,8) sowie
//   über die x-Achse (sin), Ueberhang haengt an den Giebeln durch
// - Ecken-Knicke (Fabric spannt von First zu Traufe und knickt an den Ecken)
// - eingebackene Windwelle mit zufaelliger Phase pro Variante (Instancing
//   erlaubt keine Per-Instance-Bake — stattdessen 3 Geometrie-Varianten,
//   abwechselnd verwendet)
// uv.v = Hoehenanteil (D2: Wind-Displacement oben mehr als am Saum).
function makeTentRoofGeo(variant: number): THREE.BufferGeometry {
  const rand = mulberry32(9100 + variant * 137);
  const phase = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;
  const amp = 0.045 + rand() * 0.045; // Amplitude der gebackenen Windwelle (VERSTAERKT: 0.018-0.038 las als starre Scheibe)
  const SX = 8;
  const SZ = 6;

  const height = (x: number, z: number): number => {
    const base = Math.max(0, 1 - Math.abs(x)); // Prisma-Profil (First 1, Traufe 0)
    const sagSpan = Math.sin(((z + 0.8) / 1.6) * Math.PI); // 0 an den Stangen, 1 dazwischen
    const inSpan = z > -0.8 && z < 0.8;
    const sag = inSpan
      ? sagSpan * 0.16
      : Math.max(0, (Math.abs(z) - 0.8) / 0.2) * 0.075; // Ueberhang haengt durch (VERSTAERKT)
    const kink = Math.max(0, Math.abs(x) - 0.35) * Math.max(0, Math.abs(z) - 0.5) * 0.28;
    const wave = Math.sin(x * 4.2 + phase) * Math.cos(z * 2.6 + phase2) * amp;
    return Math.max(0.015, base - sag * (0.35 + 0.65 * base) - kink + wave * base);
  };

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= SZ; j++) {
    for (let i = 0; i <= SX; i++) {
      const x = -1 + (2 * i) / SX;
      const z = -1 + (2 * j) / SZ;
      const y = height(x, z);
      pos.push(x, y, z);
      uvs.push((x + 1) * 0.75, y);
    }
  }
  for (let j = 0; j < SZ; j++) {
    for (let i = 0; i < SX; i++) {
      const a = j * (SX + 1) + i;
      const b = a + 1;
      const c = a + SX + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Giebel vorn (z = -1, Normale -z) und hinten (z = +1, Normale +z) mit
  // denselben deformierten Hoehen wie die Dachkante
  const gable = (z: number, front: boolean) => {
    const gy = [height(-1, z), height(1, z), height(0, z)];
    const base = pos.length / 3;
    pos.push(-1, gy[0], z, 1, gy[1], z, 0, gy[2], z);
    uvs.push(0, gy[0], 0.75, gy[1], 0.375, gy[2]);
    if (front) idx.push(base, base + 2, base + 1);
    else idx.push(base, base + 1, base + 2);
  };
  gable(-1, true);
  gable(1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals(); // Normalen nach der Deformation neu berechnen
  return geo;
}

// Modul-Geometrien (Budget-Regel 8): 3 Dach- und 3 Saum-Varianten (D1/D3),
// abwechselnd verwendet — Material-Geometrie-Budget unveraendert (je 3).
const roofGeos = [makeTentRoofGeo(0), makeTentRoofGeo(1), makeTentRoofGeo(2)];

// Saum (D3): leicht wellig statt geradlinig — Auslenkung nach unten zunehmend
// (0,5 - y: am Ueberhang voll, an der Traufe 0), Phase pro Variante.
function makeSkirtGeo(variant: number): THREE.BufferGeometry {
  const rand = mulberry32(8800 + variant * 53);
  const phase = rand() * Math.PI * 2;
  const geo = new THREE.BoxGeometry(0.04, 1, 1, 1, 4, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const wave =
      Math.sin(z * Math.PI * 6 + phase) * 0.11 +
      Math.sin(z * Math.PI * 2.3 + phase * 1.7) * 0.075;
    pos.setX(i, x + wave * (0.5 - y));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
const skirtGeos = [makeSkirtGeo(0), makeSkirtGeo(1), makeSkirtGeo(2)];

const poleGeo = new THREE.CylinderGeometry(0.035, 0.04, 1, 6); // Stuetzstange
const guyRopeGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5); // Abspannseil
const pegGeo = new THREE.ConeGeometry(0.032, 0.3, 6);          // Zeltpflock
const doorGeo = new THREE.PlaneGeometry(0.7, 0.95);            // Eingangs-Oeffnung
const herdGeo = new THREE.ConeGeometry(1.8, 1.1, 7);           // Herdenzelt (flach)

// --- SPEC-perf-stoffe D2: Wind-Animation via onBeforeCompile ---
// pos.y += sin(worldPos.x * 0.8 + uTime * 1.2) * 0.04 * uv.y  (oben > Saum).
// uTime wird in useFrame aktualisiert; low-Tier: OHNE Animation. Phase pro
// Stoff-Variante leicht versetzt; customProgramCacheKey trennt die Programme.
const uTime = { value: 0 };
const IS_LOW_TIER = detectQuality() === 'low';

function applyWind(mat: THREE.Material, phase: number) {
  if (IS_LOW_TIER) return;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec4 windWorld = instanceMatrix * vec4(transformed, 1.0);
  #else
    vec4 windWorld = vec4(transformed, 1.0);
  #endif
  transformed.y += sin(windWorld.x * 0.8 + uTime * 1.2 + ${phase.toFixed(3)}) * 0.09 * uv.y;`
      );
  };
  mat.customProgramCacheKey = () => `tent-wind-${phase}`;
}

// Zeltstoff (SPEC C + B): CC0 fabric-burlap als map (Tinting via color — die
// Zeltfarben 0xB99A76/0x93794F/0xCFAE82 bleiben), Normal-Map nur HIGH-Tier.
// Material-Budget: genau 3 Instanzen (Singletons).
function makeTentMaterial(color: number, phase: number): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    color,
    map: burlapColorTexture,
    normalMap: burlapNormalTexture,
    side: THREE.DoubleSide,
  });
  applyWind(mat, phase);
  return mat;
}
const tentMatA = makeTentMaterial(0xb99a76, 0);      // Basis
const tentMatB = makeTentMaterial(0x93794f, 2.1);    // abgedunkelt
const tentMatC = makeTentMaterial(0xcfae82, 4.2);    // aufgehellt
const tentMats = [tentMatA, tentMatB, tentMatC];

// Dunkle Eingangs-Oeffnung: eigenes, opakes Material (liest sich als Oeffnung)
const DOOR_MAT = new THREE.MeshLambertMaterial({ color: 0x2A211A, side: THREE.DoubleSide });

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

  // Rauch: aufsteigend, transparent, langsam driftend (3-5 Sprites);
  // D2: uTime-Uniform fuer die Zelt-Wind-Animation
  useFrame((state) => {
    uTime.value = state.clock.elapsedTime;
    const group = smokeGroup.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < group.children.length; i++) {
      const s = group.children[i] as THREE.Sprite;
      const phase = (t * 0.12 + i * 0.31) % 1;
      s.position.y = 0.6 + phase * 3.4;
      s.position.x = SMOKE_POSITIONS[i][0] + Math.sin(t * 0.25 + i * 1.7) * 0.5;
      s.material.opacity = 0.55 * Math.sin(phase * Math.PI);
    }
  });

  return (
    <group>
      {/* Prismen-Dach, 3 Stoff-/Geometrie-Varianten (3 InstancedMeshes, D1) */}
      {parts.roofs.map((batch, v) => (
        <Instanced key={`roof-${v}`} geometry={roofGeos[v]} material={tentMats[v]} transforms={batch} />
      ))}

      {/* Herabhaengender, welliger Saum, je Stoff-Variante (3 InstancedMeshes, D3) */}
      {parts.skirts.map((batch, v) => (
        <Instanced key={`skirt-${v}`} geometry={skirtGeos[v]} material={tentMats[v]} transforms={batch} />
      ))}

      {/* Stuetzstangen + Abspannseile + Zeltpflloecke (je 1 InstancedMesh) */}
      <Instanced geometry={poleGeo} material={ACACIA_WOOD} transforms={parts.poles} />
      <Instanced geometry={guyRopeGeo} material={ROPE} transforms={parts.ropes} />
      <Instanced geometry={pegGeo} material={ACACIA_WOOD} transforms={parts.pegs} />

      {/* Dunkle Eingangs-Oeffnungen (eigenes dunkles Material) */}
      <Instanced geometry={doorGeo} material={DOOR_MAT} transforms={parts.doors} />

      {/* Kleine Herdenzelte (20%, flache Kegel) */}
      <Instanced geometry={herdGeo} material={tentMatC} transforms={parts.herd} />

      {/* 3-5 Rauchsäulen — eigenes Material pro Sprite (Opacity animiert) */}
      <group ref={smokeGroup}>
        {SMOKE_POSITIONS.slice(0, smokeCount).map((p, i) => (
          <sprite key={`smoke-${i}`} position={p} scale={[3.0, 4.5, 1]}>
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
