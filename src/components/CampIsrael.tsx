import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURTYARD_Z_CENTER } from './TabernacleFloor';
import { Instanced, type Vec3 } from '../utils/instancing';
import { tentStripeTexture, smokeTexture } from '../utils/textures';

// Camp Israel — deutbare Zutat nach 4. Mose 2, nicht Teil der Exodus-Spezifikation.
// 40-60 einfache Low-Poly-Zelte (3 Formen, InstancedMesh, gedeckte Stofffarben)
// im Ring um den Vorhof (Abstand 25-40 m); der Vorhofskeil im Osten bleibt frei
// als Platz des Volkes. 5 Rauchsäulen (transparente, animierte Sprites) bei
// Zeltgruppen. Keine castShadow, < 15 Draw Calls durch Instancing.
// KEINE Menschengestalten, KEINE Tiere (Ablenkungsgefahr).

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

interface TentSpec {
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

function generateTents(): { cones: TentSpec[]; prisms: TentSpec[]; striped: TentSpec[] } {
  const rand = mulberry32(40277);
  const cones: TentSpec[] = [];
  const prisms: TentSpec[] = [];
  const striped: TentSpec[] = [];
  for (let i = 0; i < TENT_COUNT; i++) {
    // Ringwinkel: Osten (Richtung z = 0, also d.z < 0) bleibt als Keil frei
    const angle = rand() * Math.PI * 2;
    const dir = { x: Math.sin(angle), z: Math.cos(angle) };
    if (dir.z < -0.7) continue; // Ostkeil frei (schmaler, Platz des Volkes)
    const radius = 25 + rand() * 15; // 25-40 m um die Vorhof-Mitte
    const spec: TentSpec = {
      x: dir.x * radius + (rand() - 0.5) * 4,
      z: CENTER_Z + dir.z * radius + (rand() - 0.5) * 4,
      rotY: rand() * Math.PI * 2,
      scale: 1.2 + rand() * 0.6, // 1,2-1,8: Camp bleibt trotz Keil sichtbar
    };
    const kind = i % 3;
    if (kind === 0) cones.push(spec);
    else if (kind === 1) prisms.push(spec);
    else striped.push(spec);
  }
  return { cones, prisms, striped };
}

// Kegel/Prismen sind zentriert: y = halbe Hoehe * Scale, damit nichts im
// Boden versinkt (Kegel 2,2m -> 1,1, Prisma 1,9m -> 0,95)
function toTransforms(
  list: TentSpec[],
  halfHeight: number
): { position: Vec3; rotation: Vec3; scale: number }[] {
  return list.map((t) => ({
    position: [t.x, halfHeight * t.scale, t.z],
    rotation: [0, t.rotY, 0],
    scale: t.scale,
  }));
}

// Modul-Geometrien (Budget-Regel 8)
const coneGeo = new THREE.ConeGeometry(1.3, 2.2, 7);
const prismGeo = new THREE.ConeGeometry(1.4, 1.9, 4);

// Gedeckte Stofffarben (Sand/Braun/Graubeige)
const tentSandMat = new THREE.MeshLambertMaterial({ color: 0xA89068 });
const tentBrownMat = new THREE.MeshLambertMaterial({ color: 0x7A5C40 });
const tentStripeMat = new THREE.MeshLambertMaterial({ map: tentStripeTexture });

// 5 Rauchpositionen bei Zeltgruppen
const SMOKE_POSITIONS: Vec3[] = [
  [-30, 0.6, 8],
  [28, 0.6, 12],
  [-26, 0.6, 38],
  [30, 0.6, 36],
  [0, 0.6, 60],
];

export function CampIsrael() {
  const tents = useMemo(generateTents, []);
  const smokeGroup = useRef<THREE.Group>(null);

  // Rauch: aufsteigend, transparent, langsam driftend (nur 5 Sprites)
  useFrame((state) => {
    const group = smokeGroup.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < group.children.length; i++) {
      const s = group.children[i] as THREE.Sprite;
      const phase = (t * 0.12 + i * 0.31) % 1;
      s.position.y = 0.6 + phase * 3.4;
      s.position.x = SMOKE_POSITIONS[i][0] + Math.sin(t * 0.25 + i * 1.7) * 0.5;
      s.material.opacity = 0.26 * Math.sin(phase * Math.PI);
    }
  });

  return (
    <group>
      {/* Zelte: 3 InstancedMeshes (Kegel, Prismen, gestreift) */}
      <Instanced geometry={coneGeo} material={tentSandMat} transforms={useMemo(() => toTransforms(tents.cones, 1.1), [tents])} />
      <Instanced geometry={prismGeo} material={tentBrownMat} transforms={useMemo(() => toTransforms(tents.prisms, 0.95), [tents])} />
      <Instanced geometry={coneGeo} material={tentStripeMat} transforms={useMemo(() => toTransforms(tents.striped, 1.1), [tents])} />

      {/* 5 Rauchsäulen — eigenes Material pro Sprite (Opacity animiert) */}
      <group ref={smokeGroup}>
        {SMOKE_POSITIONS.map((p, i) => (
          <sprite key={`smoke-${i}`} position={p} scale={[1.6, 2.2, 1]}>
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
