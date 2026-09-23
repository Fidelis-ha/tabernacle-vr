import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

// Instancing-Helfer (Budget-Regel 2 + 8): wiederholte Meshes als
// InstancedMesh mit Modul-Geometrien — 1 Draw Call pro Bauteil-Typ.

export type Vec3 = [number, number, number];

export interface InstanceTransform {
  position?: Vec3;
  rotation?: Vec3;
  quaternion?: THREE.Quaternion;
  scale?: Vec3 | number;
}

// Matrix fuer ein von start nach end laufendes Seil (Einheitszylinder wird skaliert)
export function ropeTransform(start: Vec3, end: Vec3): InstanceTransform {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = e.clone().sub(s);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  const mid = s.clone().add(e).multiplyScalar(0.5);
  return { position: [mid.x, mid.y, mid.z], quaternion, scale: [1, length, 1] };
}

export function Instanced({
  geometry,
  material,
  transforms,
  castShadow = false,
  receiveShadow = false,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  transforms: InstanceTransform[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

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
      if (t.quaternion) {
        q.copy(t.quaternion);
      } else {
        const rot = t.rotation ?? [0, 0, 0];
        q.setFromEuler(e.set(rot[0], rot[1], rot[2]));
      }
      const sc = t.scale ?? 1;
      if (typeof sc === 'number') s.set(sc, sc, sc);
      else s.set(sc[0], sc[1], sc[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  );
}
