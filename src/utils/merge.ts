import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from './instancing';

export interface MergePart {
  geo: THREE.BufferGeometry;
  p?: Vec3;
  r?: Vec3;
  s?: Vec3 | number;
}

export function mergeParts(parts: MergePart[]): THREE.BufferGeometry {
  const geos = parts.map(({ geo, p, r, s }) => {
    const g = geo.clone();
    const q = new THREE.Quaternion();
    if (r) q.setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
    const sc = s ?? 1;
    const v =
      typeof sc === 'number'
        ? new THREE.Vector3(sc, sc, sc)
        : new THREE.Vector3(sc[0], sc[1], sc[2]);
    const pos = p ?? [0, 0, 0];
    g.applyMatrix4(
      new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, v)
    );
    return g;
  });
  // ExtrudeGeometry & Co. sind nicht-indexed — alle Teile auf EINEN
  // Index-Modus normalisieren, sonst liefert mergeGeometries null
  const anyNonIndexed = geos.some((g) => g.index === null);
  const normalized = anyNonIndexed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos;
  return mergeGeometries(normalized)!;
}
