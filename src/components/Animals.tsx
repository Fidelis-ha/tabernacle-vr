import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { InstanceTransform, Vec3 } from '../utils/instancing';
import { TENT_SPECS, inCourtyardKeepout } from './CampIsrael';
import { QUALITY_SETTINGS, detectQuality } from '../utils/quality';

// Herde des Volks (deutbare Zutat, Ex 12,38: "auch Kleinvieh zog mit")
// SPEC-marc-feedback2 B: Esel/Kuh/Alpaka als animierte Quaternius-CC0-Assets
// (public/models/animals/{Donkey,Cow,Alpaca}.glb — Draco, 1 Palette-Material,
// je 7-8 Primitives; Alpaca = Kamelid-Ersatz). Schaf/Ziege bleiben PROZEDURAL
// (InstancedMesh, kein CC0-Schaf verfügbar — models/animals/LICENSE-CC0.md);
// der alte prozedurale Esel ("sieht nicht gut aus" — Marc) entfällt.
// B1: useGLTF(path, true) + useAnimations, gemischte Clips (meist Idle/Eating,
// gelegentlich Walk auf kurzer Strecke), Eigenzeit-Offset je Instanz (kein Chor).
// B3: Skalierung per BBox-Messung + Schulter-Knochen des Rigs (nicht raten):
// Esel ~1,1 m Schulter, Kuh ~1,3 m, Alpaka ~0,9 m.
// B4: low-Tier 1 je Asset-Art, Schafe 6 (skeletal ist billig).
// A2: Vorhof-Sperrzone (inCourtyardKeepout) gilt für ALLE Tier-Anker.
// SkinnedMesh NICHT instanced — Draw Calls ≈ Primitives × Instanzen
// (high: 8 Instanzen ≈ 60, low: 3 ≈ 22), kein castShadow.
// Prozedural: InstancedMesh je Koerperteil, 2 Materialien, < 10 Draw Calls.
// KEINE Menschengestalten.

interface AnimalSpec {
  x: number;
  z: number;
  rotY: number;
  scale: number;
  kind: 'sheep' | 'goat';
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
    // A2: Vorhof-Sperr-Kasten (SPEC-marc-feedback2) — zusätzlich zur alten
    // Vorhof-Nähe: |x| < 27 && z > -7 && z < 52 ist gesperrt
    if (inCourtyardKeepout(x, z)) return false;
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
      scale: 0.8 + rand() * 0.3,
      kind,
    });
    return true;
  };

  const goats = Math.max(2, Math.round(q.sheep / 3));
  for (let i = 0; i < q.sheep - goats; i++) tryPlace('sheep');
  for (let i = 0; i < goats; i++) tryPlace('goat');
  return animals;
}

// --- Geometrien (FORMtreu low-poly, Formen eingebacken; Schwan-
//     stummel direkt in die Koerper-Geometrie gemergt, um Draw Calls zu sparen) ---
const _tailStub = new THREE.ConeGeometry(0.05, 0.16, 5);
_tailStub.rotateX(2.4);
_tailStub.translate(0, 0.64, -0.7);
const bodyGeo = mergeGeometries([
  new THREE.SphereGeometry(0.5, 9, 7),
  _tailStub,
])!;
bodyGeo.scale(0.85, 0.72, 1.32); // abgeflachte Kapsel (Rumpf) + Schwanz-Stummel
const headGeo = new THREE.SphereGeometry(0.16, 8, 7);
const snoutGeo = new THREE.ConeGeometry(0.085, 0.24, 6);     // Schnauze, abwaerts
const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5); // Beine via Instanz-Scale
const earGeo = new THREE.ConeGeometry(0.05, 0.17, 5);        // seitlich flach
const hornGeo = new THREE.TorusGeometry(0.07, 0.016, 5, 8, Math.PI * 0.9); // Ziegenhorn
const beardGeo = new THREE.ConeGeometry(0.035, 0.12, 5);     // Ziegenbart

// --- Materialien (prozedurale Herde: 2 neue) ---
const WOOL = new THREE.MeshLambertMaterial({ color: 0xE6DDC9 });  // Schafwolle hell
const GOAT = new THREE.MeshLambertMaterial({ color: 0x5E432C });  // Ziege dunkelbraun

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
const _tmpQ = new THREE.Quaternion();
const _X_AXIS = new THREE.Vector3(1, 0, 0);

// === SPEC-marc-feedback2 B: Quaternius-Assets (CC0, Draco, animiert) ===

type GltfSpeciesKey = 'Donkey' | 'Cow' | 'Alpaca';

interface GltfSpeciesCfg {
  key: GltfSpeciesKey;
  path: string;
  shoulder: number; // Soll-Schulterhoehe in Metern (B3)
  countHigh: number; // B2: 2-3 Instanzen je Art im HIGH-Tier
}

const GLB_ANIMALS: GltfSpeciesCfg[] = [
  { key: 'Donkey', path: '/models/animals/Donkey.glb', shoulder: 1.1, countHigh: 3 },
  { key: 'Cow', path: '/models/animals/Cow.glb', shoulder: 1.3, countHigh: 3 },
  { key: 'Alpaca', path: '/models/animals/Alpaca.glb', shoulder: 0.9, countHigh: 2 }, // Kamelid-Ersatz
];
const GLB_BY_KEY: Record<GltfSpeciesKey, GltfSpeciesCfg> = {
  Donkey: GLB_ANIMALS[0],
  Cow: GLB_ANIMALS[1],
  Alpaca: GLB_ANIMALS[2],
};

const IS_LOW_TIER = detectQuality() === 'low';

interface GltfAnchor {
  species: GltfSpeciesKey;
  x: number;
  z: number;
  rotY: number;
  mode: 'idle' | 'eat' | 'walk';
  offset: number; // Eigenzeit-Offset (kein Choreographie-Chor)
}

function generateGltfAnchors(): GltfAnchor[] {
  const rand = mulberry32(51503);
  const anchors: GltfAnchor[] = [];
  for (const cfg of GLB_ANIMALS) {
    // B4: low-Tier 1 je Asset-Art (Animationen bleiben, skeletal ist billig)
    const count = IS_LOW_TIER ? 1 : cfg.countHigh;
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 300; tries++) {
        // B5: in Herden-Nähe — gleicher offener Ring wie die prozedurale Herde
        const ringA = rand() * Math.PI * 2;
        const ringR = 26 + rand() * 10;
        const x = Math.sin(ringA) * ringR;
        const z = 22.5 + Math.cos(ringA) * ringR;
        // A2: Vorhof-Sperr-Kasten — es reicht NICHT, nur die Zelt-Anker
        // abzuklopfen, der Kasten wird zusätzlich geprüft
        if (inCourtyardKeepout(x, z)) continue;
        const dz = z - 22.5;
        if (dz < 0 && Math.abs(x) < Math.hypot(x, dz) * 0.55) continue; // Ostkeil
        let blocked = false;
        for (const t of TENT_SPECS) {
          if (Math.hypot(t.x - x, t.z - z) < 3) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (const o of anchors) {
            if (Math.hypot(o.x - x, o.z - z) < 3.5) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) continue;
        anchors.push({
          species: cfg.key,
          x,
          z,
          rotY: rand() * Math.PI * 2,
          // B1: meist Idle/Eating, nur die 3. Instanz einer Art (falls
          // vorhanden) geht gelegentlich auf kurzer Strecke (Walk)
          mode: count >= 3 && i === 2 ? 'walk' : i % 2 === 1 ? 'eat' : 'idle',
          offset: rand() * 10,
        });
        break;
      }
    }
  }
  return anchors;
}

// Modul-Daten (einmalig, deterministisch)
export const GLTF_ANCHORS = generateGltfAnchors();

// A3-Verifikation (Assert-artiger Check): KEIN Tier-Anker (GLB UND prozedural)
// innerhalb der Vorhof-Sperrzone.
for (const a of GLTF_ANCHORS) {
  if (inCourtyardKeepout(a.x, a.z)) {
    console.error('[Animals] ASSERT: Tier-Anker im Vorhof-Sperrkasten!', a);
  }
}

// B1: EINE Instanz pro Komponente → EIGENES AnimationMixer + Eigenzeit-Offset.
// useAnimations bindet den Mixer an die Gruppen-Ref; der SkeletonUtils-Klon
// (SkinnedMesh + Bones) hängt als <primitive> darin.
function GltfAnimal({ cfg, anchor }: { cfg: GltfSpeciesCfg; anchor: GltfAnchor }) {
  const { scene, animations } = useGLTF(cfg.path, true); // true = Draco
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  // B3: Skalierung AM ASSET messen (scene.traverse -> BBox; Schulterhöhe vom
  // Schulter-Knochen des Quaternius-Rigs ablesen), Faktor ableiten — NICHT raten.
  const metrics = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const height = Math.max(0.001, box.max.y - box.min.y);
    const shoulderBone =
      scene.getObjectByName('FrontShoulder.L') ?? scene.getObjectByName('FrontShoulder.R');
    const v = new THREE.Vector3();
    const shoulderY = shoulderBone
      ? shoulderBone.getWorldPosition(v).y
      : height * 0.78; // Fallback: Widerrist ≈ 0,78 der Gesamthöhe (Kopf/Ohren ragen darüber)
    const scale = cfg.shoulder / shoulderY;
    // Blickrichtung ableiten (keine Annahme): Kopf weiter in +z als Schwanz
    const head = scene.getObjectByName('Head');
    const tail = scene.getObjectByName('Tail1');
    const facesPlusZ = head && tail
      ? head.getWorldPosition(v).z > tail.getWorldPosition(v).z
      : true;
    return { scale, facesPlusZ, groundY: -box.min.y * scale };
  }, [scene, cfg.shoulder]);

  // SkinnedMesh kann NICHT instanced werden → SkeletonUtils-Klon je Instanz
  const clone = useMemo(() => skeletonClone(scene), [scene]);

  // B1: gemischter Clip + Eigenzeit-Offset (kein Chor)
  useEffect(() => {
    const clipName =
      anchor.mode === 'walk' ? 'Walk' : anchor.mode === 'eat' ? 'Eating' : 'Idle';
    const action = actions[clipName] ?? actions['Idle'];
    if (!action) return;
    action.reset();
    action.play();
    action.time = anchor.offset % Math.max(0.001, action.getClip().duration);
    return () => {
      action.stop();
    };
  }, [actions, anchor.mode, anchor.offset]);

  // Walk-Instanz: kurze Strecke (Ping-Pong), Drehung an den Enden
  const walkState = useRef({ p: 0, v: 1, len: 4.5 });
  const baseFacing = anchor.rotY + (metrics.facesPlusZ ? 0 : Math.PI);
  useFrame((_, dt) => {
    if (anchor.mode !== 'walk') return;
    const g = group.current;
    if (!g) return;
    const s = walkState.current;
    s.p += s.v * 0.75 * Math.min(dt, 0.1);
    if (s.p > s.len) {
      s.p = s.len;
      s.v = -1;
    }
    if (s.p < 0) {
      s.p = 0;
      s.v = 1;
    }
    g.rotation.y = s.v > 0 ? baseFacing : baseFacing + Math.PI;
    g.position.x = anchor.x + Math.sin(baseFacing) * s.p;
    g.position.z = anchor.z + Math.cos(baseFacing) * s.p;
  });

  return (
    <group
      ref={group}
      position={[anchor.x, metrics.groundY, anchor.z]}
      rotation={[0, baseFacing, 0]}
      scale={metrics.scale}
    >
      <primitive object={clone} />
    </group>
  );
}

function GltfHerd() {
  return (
    <group>
      {GLTF_ANCHORS.map((a, i) => (
        <GltfAnimal key={`${a.species}-${i}`} cfg={GLB_BY_KEY[a.species]} anchor={a} />
      ))}
    </group>
  );
}

export function Animals() {
  const animals = useMemo(generateHerd, []);

  // A3-Verifikation (Assert): auch die prozedurale Herde liegt nicht in
  // der Vorhof-Sperrzone (GLB-Anker werden module-level geprüft).
  for (const a of animals) {
    if (inCourtyardKeepout(a.x, a.z)) {
      console.error('[Animals] ASSERT: Herde im Vorhof-Sperrkasten!', a);
    }
  }

  const { sheep, goats } = useMemo(() => {
    return {
      sheep: animals.filter((a) => a.kind === 'sheep'),
      goats: animals.filter((a) => a.kind === 'goat'),
    };
  }, [animals]);

  // Refs fuer die animierten Teile (Koepfe je Spezies)
  const headRefs = {
    sheep: useRef<THREE.InstancedMesh>(null),
    goat: useRef<THREE.InstancedMesh>(null),
  };

  // Minimal-Animation (SPEC D): 2-3 Koepfe nicken (Phasen versetzt)
  const animated = useMemo(() => {
    const heads: { mesh: 'sheep' | 'goat'; index: number; qYaw: THREE.Quaternion; pos: THREE.Vector3; scale: THREE.Vector3; phase: number }[] = [];
    partInstances(sheep, SHEEP_HEAD).forEach((h, i) => {
      if (i < 2) heads.push({ mesh: 'sheep', index: i, qYaw: h.qYaw, pos: new THREE.Vector3(...(h.t.position as Vec3)), scale: new THREE.Vector3(...(h.t.scale as Vec3)), phase: i * 1.9 });
    });
    partInstances(goats, SHEEP_HEAD).forEach((h, i) => {
      if (i < 1) heads.push({ mesh: 'goat', index: i, qYaw: h.qYaw, pos: new THREE.Vector3(...(h.t.position as Vec3)), scale: new THREE.Vector3(...(h.t.scale as Vec3)), phase: 2.6 });
    });
    return { heads };
  }, [sheep, goats]);

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
  });

  // Bauteil-Batches (Draw Calls: 2 Koerper + 2 Koepfe + 1 Schnauze + 1 Beine
  // + 1 Ohren hell + 1 Ohren dunkel + 1 Hoerner/Bart = 9 < 15)
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

  return (
    <group>
      {/* === GLB-Tiere (Esel/Kuh/Alpaca, animiert, B) === */}
      <GltfHerd />

      {/* Koerper (je Spezies 1 InstancedMesh; Schafschwanz-Stummel eingebacken) */}
      <Batch geometry={bodyGeo} material={WOOL} transforms={useMemo(() => partInstances(sheep, SHEEP_BODY).map((x) => x.t), [sheep])} />
      <Batch geometry={bodyGeo} material={GOAT} transforms={useMemo(() => partInstances(goats, GOAT_BODY).map((x) => x.t), [goats])} />

      {/* Koepfe (animiert: sanftes Nicken) */}
      <Batch geometry={headGeo} material={WOOL} transforms={useMemo(() => partInstances(sheep, SHEEP_HEAD).map((x) => x.t), [sheep])} meshRef={headRefs.sheep} />
      <Batch geometry={headGeo} material={GOAT} transforms={useMemo(() => partInstances(goats, SHEEP_HEAD).map((x) => x.t), [goats])} meshRef={headRefs.goat} />

      {/* Schnauzen (leicht abwaerts geneigt) */}
      <Batch geometry={snoutGeo} material={GOAT} transforms={useMemo(() => [
        ...partInstances(sheep, SHEEP_SNOUT).map((x) => x.t),
        ...partInstances(goats, SHEEP_SNOUT).map((x) => x.t),
      ], [sheep, goats])} />

      {/* Beine (alle Tiere, EIN Batch, dunkles Beinmaterial) */}
      <Batch geometry={legGeo} material={GOAT} transforms={legs} />

      {/* Ohren: hell (Schafe) + dunkel (Ziegen) */}
      <Batch geometry={earGeo} material={WOOL} transforms={woolEars.map((x) => x.t)} />
      <Batch geometry={earGeo} material={GOAT} transforms={goatEars.map((x) => x.t)} />

      {/* Ziegen: Hoerner + Bart (EIN Batch) */}
      <Batch geometry={hornGeo} material={GOAT} transforms={useMemo(() => [
        ...partInstances(goats, GOAT_HORN[0]).map((x) => x.t),
        ...partInstances(goats, GOAT_HORN[1]).map((x) => x.t),
        ...partInstances(goats, GOAT_BEARD).map((x) => x.t),
      ], [goats])} />
    </group>
  );
}
