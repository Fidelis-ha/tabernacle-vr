import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { InstanceTransform, Vec3 } from '../utils/instancing';
import { TENT_SPECS } from './CampIsrael';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';

// Herde des Volks (deutbare Zutat, Ex 12,38: "auch Kleinvieh zog mit")
// SPEC D: 12-18 Schafe/Ziegen (hell, einige dunkelbraun) + 3-5 Esel (grau),
// im Camp zwischen den Zeltgruppen (TENT_SPECS als Anker + Versatz),
// Ostkeil + Vorhof frei. Low-Poly aber FORMtreu (Kapsel-Koerper, Kugel-Kopf,
// abwaerts geneigte Schnauze, 4 Zylinderbeine, Ohren, Schwaenze; Ziege mit
// Bart + Hoernern, Esel gross mit Langohren + Maehne + Quastenschwanz).
// Animation MINIMAL: 2-3 Koepfe nicken, 1-2 Esel schlagen mit dem Schwanz.
// InstancedMesh je Koerperteil, 3 Materialien, kein castShadow, < 15 Draw Calls.

interface AnimalSpec {
  x: number;
  z: number;
  rotY: number;
  scale: number;
  kind: 'sheep' | 'goat' | 'donkey';
}

// Deterministischer Zufall (stabile Herde über Reloads)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHerd(): AnimalSpec[] {
  const q = QUALITY_SETTINGS[detectQuality()];
  const rand = mulberry32(77821);
  const animals: AnimalSpec[] = [];
  const anchors = TENT_SPECS;

  const tryPlace = (kind: AnimalSpec['kind']): boolean => {
    // SICHTBARKEIT (Re-Review-Befund 2): Tiere im offenen Ring 26-36 m,
    // aber OHNE Kollision mit Zelten (TENT_SPECS, Freihalt 3 m) — und ein
    // Teil bewusst in die Sichtachse vom Osttor (Spieler startet Richtung West).
    const ringA = rand() * Math.PI * 2;
    const ringR = 26 + rand() * 10;
    const x = Math.sin(ringA) * ringR;
    const z = 22.5 + Math.cos(ringA) * ringR;
    // Vorhof-Umfeld + Ostkeil (Platz des Volkes) frei lassen
    if (x > -13 && x < 13 && z > -2 && z < 47) return false;
    const dz = z - 22.5;
    const dx = x;
    const r = Math.hypot(dx, dz);
    if (r < 22) return false;
    if (dz < 0 && Math.abs(dx) < r * 0.55) return false; // Ostkeil
    // KEINE Kollision mit Zelten (Re-Review-Befund 2): Freihalt ~3 m um
    // jedes Zeltzentrum (Dachhalbbreite + Seile + Pflloecke)
    for (const t of anchors) {
      if (Math.hypot(t.x - x, t.z - z) < 3) return false;
    }
    // Mindestabstand zu bereits platzierten Tieren
    for (const o of animals) {
      if (Math.hypot(o.x - x, o.z - z) < 1.6) return false;
    }
    animals.push({
      x,
      z,
      rotY: rand() * Math.PI * 2,
      scale: kind === 'donkey' ? 1.15 + rand() * 0.2 : 0.8 + rand() * 0.3,
      kind,
    });
    return true;
  };

  const goats = Math.max(2, Math.round(q.sheep / 3));
  for (let i = 0; i < q.sheep - goats; i++) tryPlace('sheep');
  for (let i = 0; i < goats; i++) tryPlace('goat');
  for (let i = 0; i < q.donkeys; i++) tryPlace('donkey');
  return animals;
}

// --- Geometrien (FORMtreu low-poly, Formen eingebacken; Schwan-
//     stummel bzw. Eselschwanz+Bueschel direkt in die Koerper-/Schwanz-
//     Geometrie gemergt, um Draw Calls zu sparen) ---
const _tailStub = new THREE.ConeGeometry(0.05, 0.16, 5);
_tailStub.rotateX(2.4);
_tailStub.translate(0, 0.64, -0.7);
const bodyGeo = mergeGeometries([
  new THREE.SphereGeometry(0.5, 9, 7),
  _tailStub,
])!;
bodyGeo.scale(0.85, 0.72, 1.32); // abgeflachte Kapsel (Rumpf) + Schwanz-Stummel
const donkeyBodyGeo = new THREE.SphereGeometry(0.5, 9, 7);
donkeyBodyGeo.scale(0.95, 0.85, 1.45);
const headGeo = new THREE.SphereGeometry(0.16, 8, 7);
const snoutGeo = new THREE.ConeGeometry(0.085, 0.24, 6);     // Schnauze, abwaerts
const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5); // Esel-Beine via Instanz-Scale
const earGeo = new THREE.ConeGeometry(0.05, 0.17, 5);        // seitlich flach; Esel-Langohren via Instanz-Scale
const donkeyTailGeo: THREE.BufferGeometry = (() => {
  // Schwanz + Quasten-Bueschel als EINE Geometrie, Pivot an der Schwanzwurzel
  // (0,0,0) — schwingt beim Schlagen um den Ansatz
  const shaft = new THREE.CylinderGeometry(0.022, 0.014, 0.55, 5);
  shaft.translate(0, -0.275, 0);
  shaft.rotateX(0.35);
  const tuft = new THREE.ConeGeometry(0.05, 0.16, 6);
  tuft.rotateX(Math.PI);
  tuft.translate(0, -0.6, -0.205);
  return mergeGeometries([shaft, tuft])!;
})();
const hornGeo = new THREE.TorusGeometry(0.07, 0.016, 5, 8, Math.PI * 0.9); // Ziegenhorn
const beardGeo = new THREE.ConeGeometry(0.035, 0.12, 5);     // Ziegenbart
const maneGeo = new THREE.BoxGeometry(0.045, 0.09, 0.44);    // Esel-Maehne

// --- Materialien (SPEC D: genau 3 neue) ---
const WOOL = new THREE.MeshLambertMaterial({ color: 0xE6DDC9 });  // Schafwolle hell
const GOAT = new THREE.MeshLambertMaterial({ color: 0x5E432C });  // Ziege dunkelbraun
const DONKEY = new THREE.MeshLambertMaterial({ color: 0x8A7E70 }); // Esel grau-braun

// Lokale Bauteil-Definitionen (Tierblickrichtung: +z lokal)
interface PartLocal {
  p: Vec3;
  r?: Vec3;
  s?: Vec3 | number;
}
const SHEEP_BODY: PartLocal = { p: [0, 0.55, 0] };
const SHEEP_HEAD: PartLocal = { p: [0, 0.78, 0.62] };
const SHEEP_SNOUT: PartLocal = { p: [0, 0.7, 0.82], r: [Math.PI / 2 - 0.35, 0, 0] };
const SHEEP_LEG: PartLocal[] = [
  { p: [0.22, 0.27, 0.42] }, { p: [-0.22, 0.27, 0.42] },
  { p: [0.22, 0.27, -0.42] }, { p: [-0.22, 0.27, -0.42] },
];
const SHEEP_EAR: PartLocal[] = [
  { p: [0.15, 0.86, 0.58], r: [0, 0, Math.PI / 2 + 0.35] },
  { p: [-0.15, 0.86, 0.58], r: [0, 0, -Math.PI / 2 - 0.35] },
];
const GOAT_BODY: PartLocal = { p: [0, 0.56, 0], s: [0.88, 1, 1] }; // schlanker
const GOAT_HORN: PartLocal[] = [
  { p: [0.07, 0.94, 0.56], r: [1.2, 0, 0.5] },
  { p: [-0.07, 0.94, 0.56], r: [1.2, 0, -0.5] },
];
const GOAT_BEARD: PartLocal = { p: [0, 0.6, 0.72], r: [2.9, 0, 0] };
const DONKEY_BODY: PartLocal = { p: [0, 0.82, 0] };
const DONKEY_HEAD: PartLocal = { p: [0, 1.12, 0.74], s: [1.2, 1.2, 1.2] };
const DONKEY_SNOUT: PartLocal = { p: [0, 1.0, 0.98], r: [Math.PI / 2 - 0.3, 0, 0], s: [1.2, 1.3, 1.2] };
const DONKEY_LEG_POS: Vec3[] = [
  [0.28, 0.4, 0.5], [-0.28, 0.4, 0.5],
  [0.28, 0.4, -0.5], [-0.28, 0.4, -0.5],
];
const DONKEY_LEG_SCALE: Vec3 = [1.2, 1.45, 1.2];
const DONKEY_EAR_POS: { p: Vec3; r: Vec3 }[] = [
  { p: [0.1, 1.3, 0.66], r: [-0.12, 0, 0.1] },
  { p: [-0.1, 1.3, 0.66], r: [-0.12, 0, -0.1] },
];
const DONKEY_EAR_SCALE: Vec3 = [1.1, 2.0, 1.1];
const DONKEY_MANE: PartLocal = { p: [0, 1.24, 0.45], r: [0.5, 0, 0] };
const DONKEY_TAIL: PartLocal = { p: [0, 0.9, -0.78] }; // Pivot an der Schwanzwurzel

// Instanz-Transform: Lokalwerte -> Welt (Yaw um die Tier-Achse + Skalierung)
const _qYaw = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
function partInstances(list: AnimalSpec[], local: PartLocal): { t: InstanceTransform; qYaw: THREE.Quaternion }[] {
  return list.map((a) => {
    const ls = local.s ?? 1;
    const s: Vec3 = typeof ls === 'number' ? [ls, ls, ls] : [ls[0], ls[1], ls[2]];
    _qYaw.setFromEuler(_e.set(0, a.rotY, 0));
    _qLocal.setFromEuler(_e.set(local.r?.[0] ?? 0, local.r?.[1] ?? 0, local.r?.[2] ?? 0));
    const lx = local.p[0] * a.scale;
    const ly = local.p[1] * a.scale;
    const lz = local.p[2] * a.scale;
    const c = Math.cos(a.rotY);
    const sn = Math.sin(a.rotY);
    _p.set(a.x + lx * c + lz * sn, ly, a.z - lx * sn + lz * c);
    return {
      t: {
        position: [_p.x, _p.y, _p.z],
        quaternion: _qYaw.clone().multiply(_qLocal),
        scale: [s[0] * a.scale, s[1] * a.scale, s[2] * a.scale],
      },
      qYaw: _qYaw.clone(),
    };
  });
}

// Batch mit optionalem Mesh-Ref (fuer die Minimal-Animation)
function Batch({
  geometry,
  material,
  transforms,
  meshRef,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  transforms: InstanceTransform[];
  meshRef?: { current: THREE.InstancedMesh | null };
}) {
  const inner = useRef<THREE.InstancedMesh>(null);
  const ref = meshRef ?? inner;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      const pos = t.position ?? [0, 0, 0];
      p.set(pos[0], pos[1], pos[2]);
      if (t.quaternion) q.copy(t.quaternion);
      else q.setFromEuler(e.set(...((t.rotation ?? [0, 0, 0]) as Vec3)));
      const sc = t.scale ?? 1;
      if (typeof sc === 'number') s.set(sc, sc, sc);
      else s.set(sc[0], sc[1], sc[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms, ref]);

  if (transforms.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(transforms.length, 1)]}
      frustumCulled={false}
    />
  );
}

// Wiederverwendete Temp-Objekte (KEINE Allokation pro Frame, Budget-Regel)
const _nodQ = new THREE.Quaternion();
const _nodM = new THREE.Matrix4();
const _nodV = new THREE.Vector3();
const _nodV2 = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();
const _X_AXIS = new THREE.Vector3(1, 0, 0);

export function Animals() {
  const animals = useMemo(generateHerd, []);

  const { sheep, goats, donkeys } = useMemo(() => {
    return {
      sheep: animals.filter((a) => a.kind === 'sheep'),
      goats: animals.filter((a) => a.kind === 'goat'),
      donkeys: animals.filter((a) => a.kind === 'donkey'),
    };
  }, [animals]);

  // Refs fuer die animierten Teile (Koepfe je Spezies, Eselschwaenze)
  const headRefs = {
    sheep: useRef<THREE.InstancedMesh>(null),
    goat: useRef<THREE.InstancedMesh>(null),
  };
  const tailRef = useRef<THREE.InstancedMesh>(null);

  // Minimal-Animation (SPEC D): 2-3 Koepfe nicken (Phasen versetzt),
  // 1-2 Esel schlagen mit dem Schwanz. Kein Laufen.
  const animated = useMemo(() => {
    const heads: { mesh: 'sheep' | 'goat'; index: number; qYaw: THREE.Quaternion; pos: THREE.Vector3; scale: THREE.Vector3; phase: number }[] = [];
    partInstances(sheep, SHEEP_HEAD).forEach((h, i) => {
      if (i < 2) heads.push({ mesh: 'sheep', index: i, qYaw: h.qYaw, pos: new THREE.Vector3(...(h.t.position as Vec3)), scale: new THREE.Vector3(...(h.t.scale as Vec3)), phase: i * 1.9 });
    });
    partInstances(goats, SHEEP_HEAD).forEach((h, i) => {
      if (i < 1) heads.push({ mesh: 'goat', index: i, qYaw: h.qYaw, pos: new THREE.Vector3(...(h.t.position as Vec3)), scale: new THREE.Vector3(...(h.t.scale as Vec3)), phase: 2.6 });
    });
    const tails = partInstances(donkeys, DONKEY_TAIL).slice(0, 2);
    return { heads, tails };
  }, [sheep, goats, donkeys]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (const h of animated.heads) {
      const mesh = headRefs[h.mesh].current;
      if (!mesh) continue;
      const nod = Math.sin(t * 0.8 + h.phase) * 0.14;
      _nodQ.setFromAxisAngle(_X_AXIS, nod);
      _nodM.compose(h.pos, _tmpQ.copy(h.qYaw).multiply(_nodQ), h.scale);
      mesh.setMatrixAt(h.index, _nodM);
      mesh.instanceMatrix.needsUpdate = true;
    }
    animated.tails.forEach((tail, i) => {
      const mesh = tailRef.current;
      if (!mesh) return;
      const swish = Math.sin(t * 1.4 + i * 2.2) * 0.3;
      _nodQ.setFromAxisAngle(_X_AXIS, swish);
      _nodV.set(...(tail.t.position as Vec3));
      _nodM.compose(_nodV, _tmpQ.copy(tail.qYaw).multiply(_nodQ), _nodV2.set(...(tail.t.scale as Vec3)));
      mesh.setMatrixAt(i, _nodM);
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  // Bauteil-Batches (Draw Calls: 3 Koerper + 3 Koepfe + 1 Schnauze + 1 Beine
  // + 1 Ohren hell + 1 Ohren dunkel + 1 Eselschwaenze + 1 Hoerner/Bart
  // + 1 Maehne = 13 < 15)
  const woolEars = useMemo(() => [...partInstances(sheep, SHEEP_EAR[0]), ...partInstances(sheep, SHEEP_EAR[1])], [sheep]);
  const goatEars = useMemo(() => [...partInstances(goats, SHEEP_EAR[0]), ...partInstances(goats, SHEEP_EAR[1])], [goats]);
  const legs = useMemo(() => {
    const all = [...sheep, ...goats].flatMap((a) => [a, a, a, a]);
    return [
      ...partInstances(all.filter((_, i) => i % 4 === 0), SHEEP_LEG[0]),
      ...partInstances(all.filter((_, i) => i % 4 === 1), SHEEP_LEG[1]),
      ...partInstances(all.filter((_, i) => i % 4 === 2), SHEEP_LEG[2]),
      ...partInstances(all.filter((_, i) => i % 4 === 3), SHEEP_LEG[3]),
    ].map((x) => x.t);
  }, [sheep, goats]);
  const donkeyLegs = useMemo(() => {
    const all: AnimalSpec[] = [];
    for (const a of donkeys) {
      for (const p of DONKEY_LEG_POS) {
        all.push({ ...a });
      }
    }
    return all.map((a, i) =>
      partInstances([a], { p: DONKEY_LEG_POS[i % 4], s: DONKEY_LEG_SCALE })[0].t
    );
  }, [donkeys]);

  return (
    <group>
      {/* Koerper (je Spezies 1 InstancedMesh; Schafschwanz-Stummel eingebacken) */}
      <Batch geometry={bodyGeo} material={WOOL} transforms={useMemo(() => partInstances(sheep, SHEEP_BODY).map((x) => x.t), [sheep])} />
      <Batch geometry={bodyGeo} material={GOAT} transforms={useMemo(() => partInstances(goats, GOAT_BODY).map((x) => x.t), [goats])} />
      <Batch geometry={donkeyBodyGeo} material={DONKEY} transforms={useMemo(() => partInstances(donkeys, DONKEY_BODY).map((x) => x.t), [donkeys])} />

      {/* Koepfe (animiert: sanftes Nicken) */}
      <Batch geometry={headGeo} material={WOOL} transforms={useMemo(() => partInstances(sheep, SHEEP_HEAD).map((x) => x.t), [sheep])} meshRef={headRefs.sheep} />
      <Batch geometry={headGeo} material={GOAT} transforms={useMemo(() => partInstances(goats, SHEEP_HEAD).map((x) => x.t), [goats])} meshRef={headRefs.goat} />
      <Batch geometry={headGeo} material={DONKEY} transforms={useMemo(() => partInstances(donkeys, DONKEY_HEAD).map((x) => x.t), [donkeys])} />

      {/* Schnauzen (leicht abwaerts geneigt) */}
      <Batch geometry={snoutGeo} material={GOAT} transforms={useMemo(() => [
        ...partInstances(sheep, SHEEP_SNOUT).map((x) => x.t),
        ...partInstances(goats, SHEEP_SNOUT).map((x) => x.t),
        ...partInstances(donkeys, DONKEY_SNOUT).map((x) => x.t),
      ], [sheep, goats, donkeys])} />

      {/* Beine (alle Tiere, EIN Batch, dunkles Beinmaterial) */}
      <Batch geometry={legGeo} material={GOAT} transforms={[...legs, ...donkeyLegs]} />

      {/* Ohren: hell (Schafe) + dunkel (Ziegen + Esel-Langohren via Scale) */}
      <Batch geometry={earGeo} material={WOOL} transforms={woolEars.map((x) => x.t)} />
      <Batch geometry={earGeo} material={GOAT} transforms={useMemo(() => [
        ...goatEars.map((x) => x.t),
        ...donkeys.flatMap((a) => DONKEY_EAR_POS.map((e) =>
          partInstances([a], { p: e.p, r: e.r, s: DONKEY_EAR_SCALE })[0].t)),
      ], [goats, donkeys])} />

      {/* Esel-Schwaenze mit Quasten-Bueschel (eine Geometrie, animiert) */}
      <Batch geometry={donkeyTailGeo} material={GOAT} transforms={useMemo(() => partInstances(donkeys, DONKEY_TAIL).map((x) => x.t), [donkeys])} meshRef={tailRef} />

      {/* Ziegen: Hoerner + Bart (EIN Batch) */}
      <Batch geometry={hornGeo} material={GOAT} transforms={useMemo(() => [
        ...partInstances(goats, GOAT_HORN[0]).map((x) => x.t),
        ...partInstances(goats, GOAT_HORN[1]).map((x) => x.t),
        ...partInstances(goats, GOAT_BEARD).map((x) => x.t),
      ], [goats])} />

      {/* Esel: Maehnen-Streifen auf dem Hals-Ruecken */}
      <Batch geometry={maneGeo} material={GOAT} transforms={useMemo(() => partInstances(donkeys, DONKEY_MANE).map((x) => x.t), [donkeys])} />
    </group>
  );
}
