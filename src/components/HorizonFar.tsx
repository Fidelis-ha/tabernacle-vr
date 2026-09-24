import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURTYARD_Z_CENTER } from './TabernacleFloor';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';
import { ACACIA_WOOD, TACHASH } from '../utils/materials';
import type { Vec3 } from '../utils/instancing';

// Horizont-Umgebung (SPEC E) — alles silhouettiert, kein Schatten, < 10 Draw Calls:
// - Ferne Huegelkette: 10 grosse flache Kegel-Segmente (r 60-120, h 8-20) bei
//   300-420 m, Wuesten-Haze (0xC9B79A) — 1 InstancedMesh
// - Ferne Doerfer: 6 Cluster aus winzigen Quadern + Turm-Stummel (0x6B5A48,
//   Silhouette durch Fog) — 2 InstancedMeshes
// - Oase: 6 Palmen (gekippter Stamm + Blattkranz aus flachen Planes) bei ~200 m —
//   2 InstancedMeshes
// - Geier: 3-5 Vögel hoch am Himmel, langsame Kreisbahn (useFrame) — 1 InstancedMesh
// Material-Budget: 2 neue (HAZE, SILHOUETTE), Rest wiederverwendet.

const CENTER_Z = COURTYARD_Z_CENTER;

// Deterministischer Zufall
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HAZE = new THREE.MeshLambertMaterial({ color: 0xC9B79A });
const SILHOUETTE = new THREE.MeshLambertMaterial({ color: 0x5A4A38, side: THREE.DoubleSide }); // DoubleSide: Palmen-Fronds sonst von hinten gecullt

const hillGeo = new THREE.ConeGeometry(1, 1, 7);       // Huegel (flach skaliert)
const houseGeo = new THREE.BoxGeometry(1, 1, 1);       // Wuerfel-Quader
const towerGeo = new THREE.CylinderGeometry(0.5, 0.6, 1, 6); // Turm-Stummel
const trunkGeo = new THREE.CylinderGeometry(0.09, 0.16, 1, 5); // Palmenstamm
const frondGeo = new THREE.PlaneGeometry(2.4, 0.45, 3, 1);     // Palmenblatt
// fronds leicht bogenfoermig verbiegen (statische Geometrie)
{
  const pos = frondGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, -(x * x) * 0.06); // Spitze faellt nach unten
  }
  pos.needsUpdate = true;
  frondGeo.computeVertexNormals();
  frondGeo.translate(1.2, 0, 0); // Wurzel an x=0 (Rotation am Stammkopf)
}

// Geier: 2 Dreiecks-Fluegel + Koerper-Kapsel als EINE Geometrie (1 Draw Call)
function makeVultureGeo(): THREE.BufferGeometry {
  const tris = [
    // linker Fluegel (Dreieck)
    [-0.9, 0.05, 0.1], [0, 0, 0.25], [0, 0, -0.25],
    // rechter Fluegel
    [0.9, 0.05, 0.1], [0, 0, -0.25], [0, 0, 0.25],
    // Koerper: flaches Tetraeder-Andeutungs-Paar
    [0, 0.08, 0.4], [0.09, 0, -0.4], [-0.09, 0, -0.4],
    [-0.09, 0, -0.4], [0, -0.06, 0.35], [0, 0.08, 0.4],
  ];
  const pos: number[] = [];
  for (const v of tris) pos.push(v[0], v[1], v[2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
const vultureGeo = makeVultureGeo();

export function HorizonFar() {
  const q = QUALITY_SETTINGS[detectQuality()];

  // Huegelkette (SPEC E: 8-12 Segmente)
  const hills = useMemo(() => {
    const rand = mulberry32(31311);
    const list: { position: Vec3; scale: [number, number, number] }[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rand() * 0.4;
      const r = 300 + rand() * 120;
      const h = 8 + rand() * 12;
      list.push({
        position: [Math.sin(a) * r, h / 2, CENTER_Z + Math.cos(a) * r],
        scale: [60 + rand() * 60, h, 60 + rand() * 60],
      });
    }
    return list;
  }, []);

  // Doerfer/Weiler (6 Cluster, auf/nahe den Huegeln bei 250-350 m)
  const villageParts = useMemo(() => {
    const rand = mulberry32(47411);
    const houses: { position: Vec3; scale: [number, number, number] }[] = [];
    const towers: { position: Vec3; scale: [number, number, number] }[] = [];
    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2 + rand() * 0.6;
      const r = 255 + rand() * 80;
      const cx = Math.sin(a) * r;
      const cz = CENTER_Z + Math.cos(a) * r;
      const n = 3 + Math.floor(rand() * 3); // 3-5 Quader
      for (let h = 0; h < n; h++) {
        const w = 2 + rand() * 2;
        houses.push({
          position: [cx + (rand() - 0.5) * 14, (1 + rand()) * 0.9, cz + (rand() - 0.5) * 14],
          scale: [w, 1.8 + rand() * 1.4, w * (0.8 + rand() * 0.5)],
        });
      }
      towers.push({
        position: [cx + (rand() - 0.5) * 8, 2.4, cz + (rand() - 0.5) * 8],
        scale: [1.1, 4.8 + rand() * 1.6, 1.1],
      });
    }
    return { houses, towers };
  }, []);

  // Oase (6 Palmen bei ~200 m, seitlich versetzt)
  const oasis = useMemo(() => {
    const rand = mulberry32(52917);
    const trunks: { position: Vec3; rotation: Vec3; scale: [number, number, number] }[] = [];
    const fronds: { position: Vec3; rotation: Vec3; scale: [number, number, number] }[] = [];
    const ox = 185;
    const oz = CENTER_Z - 45;
    for (let p = 0; p < 6; p++) {
      const x = ox + (rand() - 0.5) * 26;
      const z = oz + (rand() - 0.5) * 26;
      const h = 4.5 + rand() * 2.5;
      const tilt = (rand() - 0.5) * 0.35;
      const rotZ = tilt;
      const rotY = rand() * Math.PI * 2;
      trunks.push({
        position: [x + Math.sin(-rotZ) * h * 0.5, h / 2 * Math.cos(tilt), z],
        rotation: [0, rotY, rotZ],
        scale: [1, h, 1],
      });
      const headX = x + Math.sin(-rotZ) * h;
      const headY = h * Math.cos(tilt);
      for (let f = 0; f < 7; f++) {
        fronds.push({
          position: [headX, headY, z],
          rotation: [0, (f / 7) * Math.PI * 2 + rotY, -0.45 + rand() * 0.25],
          scale: [0.9 + rand() * 0.5, 1, 1],
        });
      }
    }
    return { trunks, fronds };
  }, []);

  return (
    <group>
      {/* Huegelkette (1 Draw Call, fog-blendend) */}
      <HillField hills={hills} />

      {/* Doerfer: Quader + Tuermе (2 Draw Calls) */}
      <VillageField houses={villageParts.houses} towers={villageParts.towers} />

      {/* Oase: Stamm + Blattkranz (2 Draw Calls) */}
      <OasisField trunks={oasis.trunks} fronds={oasis.fronds} />

      {/* Geier hoch am Himmel (1 Draw Call, kreisend) */}
      <Vultures count={q.birds} />
    </group>
  );
}

// --- Instanz-Felder (statisch, Matrizen einmal gesetzt) ---

function HillField({ hills }: { hills: { position: Vec3; scale: [number, number, number] }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    hills.forEach((h, i) => {
      m.compose(
        new THREE.Vector3(...h.position),
        new THREE.Quaternion(),
        new THREE.Vector3(...h.scale)
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [hills]);
  return (
    <instancedMesh ref={ref} args={[hillGeo, HAZE, hills.length]} frustumCulled={false} />
  );
}

function VillageField({
  houses,
  towers,
}: {
  houses: { position: Vec3; scale: [number, number, number] }[];
  towers: { position: Vec3; scale: [number, number, number] }[];
}) {
  const houseRef = useRef<THREE.InstancedMesh>(null);
  const towerRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    if (houseRef.current) {
      houses.forEach((h, i) => {
        m.compose(new THREE.Vector3(...h.position), new THREE.Quaternion(), new THREE.Vector3(...h.scale));
        houseRef.current!.setMatrixAt(i, m);
      });
      houseRef.current.instanceMatrix.needsUpdate = true;
    }
    if (towerRef.current) {
      towers.forEach((t, i) => {
        m.compose(new THREE.Vector3(...t.position), new THREE.Quaternion(), new THREE.Vector3(...t.scale));
        towerRef.current!.setMatrixAt(i, m);
      });
      towerRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [houses, towers]);
  return (
    <group>
      <instancedMesh ref={houseRef} args={[houseGeo, SILHOUETTE, houses.length]} frustumCulled={false} />
      <instancedMesh ref={towerRef} args={[towerGeo, SILHOUETTE, towers.length]} frustumCulled={false} />
    </group>
  );
}

function OasisField({
  trunks,
  fronds,
}: {
  trunks: { position: Vec3; rotation: Vec3; scale: [number, number, number] }[];
  fronds: { position: Vec3; rotation: Vec3; scale: [number, number, number] }[];
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const frondRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    if (trunkRef.current) {
      trunks.forEach((t, i) => {
        m.compose(new THREE.Vector3(...t.position), q.setFromEuler(e.set(...t.rotation)), new THREE.Vector3(...t.scale));
        trunkRef.current!.setMatrixAt(i, m);
      });
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (frondRef.current) {
      fronds.forEach((f, i) => {
        m.compose(new THREE.Vector3(...f.position), q.setFromEuler(e.set(...f.rotation)), new THREE.Vector3(...f.scale));
        frondRef.current!.setMatrixAt(i, m);
      });
      frondRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [trunks, fronds]);
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, ACACIA_WOOD, trunks.length]} frustumCulled={false} />
      <instancedMesh ref={frondRef} args={[frondGeo, SILHOUETTE, fronds.length]} frustumCulled={false} />
    </group>
  );
}

// --- Geier: langsame Kreisbahn, Phasen versetzt (1 InstancedMesh) ---
const _vM = new THREE.Matrix4();
const _vQ = new THREE.Quaternion();
const _vE = new THREE.Euler();
const _vS = new THREE.Vector3(1, 1, 1);
const _vP = new THREE.Vector3();

function Vultures({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const r = 90 + i * 22;
      const speed = 0.05 + i * 0.012;
      const a = t * speed + i * 1.9;
      _vP.set(Math.sin(a) * r, 55 + i * 7 + Math.sin(t * 0.3 + i) * 2, CENTER_Z + Math.cos(a) * r);
      _vQ.setFromEuler(_vE.set(0, -a, Math.sin(t * 0.7 + i) * 0.12));
      _vM.compose(_vP, _vQ, _vS);
      mesh.setMatrixAt(i, _vM);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[vultureGeo, TACHASH, Math.max(count, 1)]} frustumCulled={false} />;
}
