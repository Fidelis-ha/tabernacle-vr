import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CUBIT,
  COURTYARD_WIDTH,
  COURTYARD_LENGTH,
  COURTYARD_WALL_HEIGHT,
  GATE_WIDTH,
  ALTAR_Z,
  BASIN_Z,
} from './TabernacleFloor';
import { SILVER, BRONZE, BYSSUS, GATE_MAT, ROPE, WATER, ACACIA_WOOD, FLAME } from '../utils/materials';
import { Instanced, ropeTransform, type InstanceTransform, type Vec3 } from '../utils/instancing';

// Vorhof nach Ex 27,9-19 / SPEC:
// 100 Ellen (45m) lang (z = 0 ... 45) x 50 Ellen (22,5m) breit (x = -11,25 ... 11,25)
// Vorhangwände 5 Ellen (2,25m) hoch, WEISSER gezwirnter Byssus (Ex 27,9)
// 60 Säulen: 20 Süd, 20 Nord, 10 West, 10 Ost (inkl. Torpfosten)
// Bronzesockel, versilberte Schäfte, Silberkappen/Haken (Ex 27,10-11)
// Hängetau von den Säulenspitzen zu Bronzepflöcken (Ex 27,19; 35,18; 38,20)
// Tor an der OSTSEITE (z = 0), 20 Ellen breit, bunt: blau/violett/scharlach/Byssus (Ex 27,16)
//
// Performance (Budget-Regel 2): 60 Säulen als 5 InstancedMeshes (Sockel, Fuss,
// Schaft, Kapitäl, Haken), Pflöcke + Tau je 1 InstancedMesh, Tor als 1 Plane
// mit Canvas-Textur. castShadow NUR an grossen Silhouetten (Wände, Altarkörper).

const H = COURTYARD_WALL_HEIGHT;   // 2,25m
const HALF_W = COURTYARD_WIDTH / 2; // 11,25m
const gateHalf = GATE_WIDTH / 2;   // 4,5m

// Modul-Geometrien (Budget-Regel 8) — geteilt für alle Instanzen
const socketGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.14, 10);
const footGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10);
const shaftGeo = new THREE.CylinderGeometry(0.055, 0.065, H, 10);
const capitalGeo = new THREE.CylinderGeometry(0.075, 0.05, 0.12, 10);
const hookGeo = new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI * 1.5);
const pegGeo = new THREE.CylinderGeometry(0.022, 0.014, 0.25, 6);
const ropeGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 5);

// Identische Inline-Geometrien als Modul-Konstanten (Budget-Regel 8)
const altarHornGeo = new THREE.ConeGeometry(0.09, 0.3, 8);        // Altar-Hoerner
const altarRingGeo = new THREE.TorusGeometry(0.07, 0.02, 6, 12);  // Altar-Ringe
const grateBarGeo = new THREE.BoxGeometry(5 * CUBIT - 0.1, 0.03, 0.03); // Rostbalken
const fireConeGeoL = new THREE.ConeGeometry(0.45, 0.85, 8); // Altarfeuer-Kegel (3 Groessen)
const fireConeGeoM = new THREE.ConeGeometry(0.3, 0.55, 8);
const fireConeGeoS = new THREE.ConeGeometry(0.26, 0.45, 8);

// Tor-Plane: leicht gewellt (8 Segmente, Sinus z +-0,03) — wirkt wie Stoff
const gateGeo = (() => {
  const geo = new THREE.PlaneGeometry(GATE_WIDTH, H, 8, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / GATE_WIDTH + 0.5; // 0..1
    pos.setZ(i, Math.sin(u * Math.PI * 4) * 0.03);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
})();

// Vorhangwaende: 20 Segmente, minimaler Sinus-Sag (~2,5cm pro Feld) —
// der Stoff haengt zwischen den Saeulen leicht durch
function makeSaggingWall(width: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, H, 20, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width + 0.5; // 0..1
    pos.setZ(i, -Math.abs(Math.sin(u * Math.PI * 20)) * 0.025);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
const wallSideGeo = makeSaggingWall(COURTYARD_LENGTH - 0.1); // Sued + Nord (identisch)
const wallWestGeo = makeSaggingWall(COURTYARD_WIDTH - 0.1);
const wallEastGeo = makeSaggingWall(HALF_W - gateHalf - 0.1);

export function TabernacleCourtyard() {
  // Süd-Reihe (x = -11,25): 20 Säulen entlang z = 0 ... 45
  const southPillars: Vec3[] = [];
  for (let i = 0; i < 20; i++) {
    southPillars.push([-HALF_W, 0, (i * COURTYARD_LENGTH) / 19]);
  }

  // Nord-Reihe (x = +11,25): 20 Säulen entlang z = 0 ... 45
  const northPillars: Vec3[] = [];
  for (let i = 0; i < 20; i++) {
    northPillars.push([HALF_W, 0, (i * COURTYARD_LENGTH) / 19]);
  }

  // West-Reihe (z = 45, Rückseite): 10 Säulen entlang x
  const westPillars: Vec3[] = [];
  for (let i = 0; i < 10; i++) {
    westPillars.push([-HALF_W + (i * COURTYARD_WIDTH) / 9, 0, COURTYARD_LENGTH]);
  }

  // Ost-Reihe (z = 0, Eingang): 6 Seitenpfosten + 4 Torpfosten = 10
  const eastPillars: Vec3[] = [];
  for (let i = 0; i < 10; i++) {
    const x = -HALF_W + (i * COURTYARD_WIDTH) / 9;
    if (Math.abs(x) < gateHalf) continue; // Torlücke
    eastPillars.push([x, 0, 0]);
  }
  const gatePillarXs = [-gateHalf, -gateHalf / 3, gateHalf / 3, gateHalf];
  gatePillarXs.forEach((x) => eastPillars.push([x, 0, 0]));

  const pillars = [...southPillars, ...northPillars, ...westPillars, ...eastPillars];

  // Hängetau + Bronzepflöcke (Ex 27,19; 35,18; 38,20): Pflöcke alle ~4,5m
  // an der Aussenlinie, Tau von der nächsten Säulenspitze zum Plock
  const ropes: InstanceTransform[] = [];
  const pegs: InstanceTransform[] = [];
  const pillarStep = COURTYARD_LENGTH / 19;
  // Süd- & Nordwand (Pflöcke 1m nach aussen, Ecken geteilt)
  for (let i = 1; i < 10; i++) {
    const z = (i * COURTYARD_LENGTH) / 10;
    const pillarZ = Math.round(z / pillarStep) * pillarStep;
    for (const side of [-1, 1]) {
      ropes.push(ropeTransform([side * HALF_W, H + 0.05, pillarZ], [side * (HALF_W + 1), 0.25, z]));
      pegs.push({ position: [side * (HALF_W + 1), 0.125, z] });
    }
  }
  // Westwand (z = 45 + 1m nach aussen)
  for (let i = 0; i <= 5; i++) {
    const x = -HALF_W + (i * COURTYARD_WIDTH) / 5;
    const pillarX = Math.round((x + HALF_W) / (COURTYARD_WIDTH / 9)) * (COURTYARD_WIDTH / 9) - HALF_W;
    ropes.push(ropeTransform([pillarX, H + 0.05, COURTYARD_LENGTH], [x, 0.25, COURTYARD_LENGTH + 1]));
    pegs.push({ position: [x, 0.125, COURTYARD_LENGTH + 1] });
  }
  // Ostwand (Eingangsseite, 1m nach aussen, neben dem Tor)
  for (const side of [-1, 1]) {
    for (const x of [side * HALF_W, side * (HALF_W - gateHalf)]) {
      const pillarX = Math.max(-HALF_W, Math.min(HALF_W, Math.round((x + HALF_W) / (COURTYARD_WIDTH / 9)) * (COURTYARD_WIDTH / 9) - HALF_W));
      ropes.push(ropeTransform([pillarX, H + 0.05, 0], [x, 0.25, -1]));
      pegs.push({ position: [x, 0.125, -1] });
    }
  }

  // Säulen-Bauteile: 5 InstancedMeshes mit je 60 Instanzen
  const sockets: InstanceTransform[] = [];
  const feet: InstanceTransform[] = [];
  const shafts: InstanceTransform[] = [];
  const capitals: InstanceTransform[] = [];
  const hooks: InstanceTransform[] = [];
  for (const [x, , z] of pillars) {
    sockets.push({ position: [x, 0.07, z] });
    feet.push({ position: [x, 0.16, z] });
    shafts.push({ position: [x, H / 2 + 0.07, z] });
    capitals.push({ position: [x, H + 0.12, z] });
    hooks.push({ position: [x, H + 0.22, z] });
  }

  return (
    <group>
      {/* === ALLE 60 SÄULEN als InstancedMeshes (Sockel: kein castShadow,
          winzige Silhouetten verursachen nur Shadow-Pass-Kosten) === */}
      <Instanced geometry={socketGeo} material={BRONZE} transforms={sockets} />
      <Instanced geometry={footGeo} material={SILVER} transforms={feet} />
      <Instanced geometry={shaftGeo} material={SILVER} transforms={shafts} />
      <Instanced geometry={capitalGeo} material={SILVER} transforms={capitals} />
      <Instanced geometry={hookGeo} material={SILVER} transforms={hooks} />

      {/* === SEITENVORHÄNGE - weisser gezwirnter Byssus (Ex 27,9) === */}

      {/* Südwand (x = -11,25) — grosse Silhouette, wirft Schatten */}
      <mesh
        position={[-HALF_W, H / 2 + 0.02, COURTYARD_LENGTH / 2]}
        geometry={wallSideGeo}
        material={BYSSUS}
        castShadow
        receiveShadow
      />

      {/* Nordwand (x = +11,25) */}
      <mesh
        position={[HALF_W, H / 2 + 0.02, COURTYARD_LENGTH / 2]}
        rotation={[0, Math.PI, 0]}
        geometry={wallSideGeo}
        material={BYSSUS}
        castShadow
        receiveShadow
      />

      {/* Westwand (z = 45, Rückseite) */}
      <mesh
        position={[0, H / 2 + 0.02, COURTYARD_LENGTH]}
        rotation={[0, -Math.PI / 2, 0]}
        geometry={wallWestGeo}
        material={BYSSUS}
        receiveShadow
      />

      {/* Ostwand (z = 0) - zwei Segmente neben dem Tor */}
      <mesh
        position={[-(HALF_W + gateHalf) / 2, H / 2 + 0.02, 0]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={wallEastGeo}
        material={BYSSUS}
        receiveShadow
      />
      <mesh
        position={[(HALF_W + gateHalf) / 2, H / 2 + 0.02, 0]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={wallEastGeo}
        material={BYSSUS}
        receiveShadow
      />

      {/* === TOR DES VORHOFES (Ex 27,16) — 1 gewellte Plane mit Canvas-Textur === */}
      <mesh position={[0, H / 2, 0]} geometry={gateGeo} material={GATE_MAT} castShadow />

      {/* === HÄNGETAU + BRONZEPLÖCKE (Ex 27,19; 35,18; 38,20) === */}
      <Instanced geometry={ropeGeo} material={ROPE} transforms={ropes} />
      <Instanced geometry={pegGeo} material={BRONZE} transforms={pegs} />

      {/* === BRANDOPFERALTAR (Ex 27,1-8; 38,1-7) - z = 27, Mittellinie === */}
      <BronzeAltar position={[0, 0, ALTAR_Z]} />

      {/* === BRONZENES WASCHBECKEN (Ex 30,18; 40,7) - z = 29,5 === */}
      <BronzeBasin position={[0, 0, BASIN_Z]} />
    </group>
  );
}

function BronzeAltar({ position }: { position: Vec3 }) {
  // 2. Mose 27,1-8 - 5 x 5 Ellen, 3 Ellen hoch, Akazien mit Bronze überzogen, hohl
  const size = 5 * CUBIT;    // 2,25m
  const height = 3 * CUBIT;  // 1,35m
  const wallT = 0.1;

  // Feuer-Animation: y-Scale +-15%, Phasen versetzt, langsam rotierend
  const fireRefs = useRef<(THREE.Mesh | null)[]>([]);
  const setFireRef = (i: number) => (m: THREE.Mesh | null) => { fireRefs.current[i] = m; };
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < fireRefs.current.length; i++) {
      const f = fireRefs.current[i];
      if (!f) continue;
      f.scale.y = 1 + Math.sin(t * 7 + i * 2.1) * 0.15;
      f.rotation.y = t * (0.6 + i * 0.35);
    }
  });

  return (
    <group position={position}>
      {/* Erhöhung / Einfassung - Rahmen aus 4 schmalen Balken, damit Rost
          und Feuer sichtbar bleiben (Ex 27,5 "wegen des Rostes") */}
      <mesh position={[0, height + 0.03, -(size + 0.15) / 2 + 0.075]} material={BRONZE} castShadow>
        <boxGeometry args={[size + 0.15, 0.08, 0.15]} />
      </mesh>
      <mesh position={[0, height + 0.03, (size + 0.15) / 2 - 0.075]} material={BRONZE} castShadow>
        <boxGeometry args={[size + 0.15, 0.08, 0.15]} />
      </mesh>
      <mesh position={[-(size + 0.15) / 2 + 0.075, height + 0.03, 0]} material={BRONZE} castShadow>
        <boxGeometry args={[0.15, 0.08, size - 0.15]} />
      </mesh>
      <mesh position={[(size + 0.15) / 2 - 0.075, height + 0.03, 0]} material={BRONZE} castShadow>
        <boxGeometry args={[0.15, 0.08, size - 0.15]} />
      </mesh>

      {/* Vier Wände - hohl im Inneren (grosse Silhouette) */}
      <mesh position={[0, height / 2, -size / 2]} material={BRONZE} castShadow>
        <boxGeometry args={[size + 0.15, height, wallT]} />
      </mesh>
      <mesh position={[0, height / 2, size / 2]} material={BRONZE} castShadow>
        <boxGeometry args={[size + 0.15, height, wallT]} />
      </mesh>
      <mesh position={[-size / 2, height / 2, 0]} material={BRONZE} castShadow>
        <boxGeometry args={[wallT, height, size]} />
      </mesh>
      <mesh position={[size / 2, height / 2, 0]} material={BRONZE} castShadow>
        <boxGeometry args={[wallT, height, size]} />
      </mesh>

      {/* Gitter / Netzwerk aus Bronze, mittig eingesetzt (Ex 27,4-5) */}
      <mesh position={[0, height * 0.5, 0]} material={BRONZE}>
        <boxGeometry args={[size - wallT, 0.05, size - wallT]} />
      </mesh>
      {[-0.8, -0.4, 0, 0.4, 0.8].map((z, i) => (
        <mesh key={`grate-${i}`} position={[0, height * 0.5 + 0.04, z]} geometry={grateBarGeo} material={BRONZE} />
      ))}

      {/* Vier HÖRNER an den vier Ecken (Ex 27,2) */}
      {[
        [-size / 2, height, -size / 2],
        [size / 2, height, -size / 2],
        [-size / 2, height, size / 2],
        [size / 2, height, size / 2],
      ].map((pos, i) => (
        <mesh key={`horn-${i}`} position={pos as Vec3} geometry={altarHornGeo} material={BRONZE} />
      ))}

      {/* Feuer auf dem Gitter - 3 überlappende Kegel, EIN geteiltes
          FLAME-Material, animiert (y-Scale +-15%, Phasen versetzt) */}
      <mesh ref={setFireRef(0)} position={[0, height * 0.5 + 0.35, 0]} geometry={fireConeGeoL} material={FLAME} />
      <mesh ref={setFireRef(1)} position={[0.18, height * 0.5 + 0.22, 0.1]} rotation={[0.12, 0, -0.15]} geometry={fireConeGeoM} material={FLAME} />
      <mesh ref={setFireRef(2)} position={[-0.15, height * 0.5 + 0.18, -0.12]} rotation={[-0.1, 0, 0.18]} geometry={fireConeGeoS} material={FLAME} />

      {/* Feuerschwingen übernimmt das flackernde Licht in TabernacleLighting */}

      {/* Ringe an den vier UNTEREN Ecken (Ex 27,4) */}
      {[
        [-size / 2 + 0.05, 0.25, -size / 2 + 0.05],
        [size / 2 - 0.05, 0.25, -size / 2 + 0.05],
        [-size / 2 + 0.05, 0.25, size / 2 - 0.05],
        [size / 2 - 0.05, 0.25, size / 2 - 0.05],
      ].map((pos, i) => (
        <mesh key={`ring-${i}`} position={pos as Vec3} rotation={[0, Math.PI / 2, 0]} geometry={altarRingGeo} material={BRONZE} />
      ))}

      {/* Tragstangen - Akazienholz mit Bronze überzogen (Ex 27,6-7) */}
      {[-size / 2 + 0.05, size / 2 - 0.05].map((z, i) => (
        <mesh key={`pole-${i}`} position={[0, 0.25, z]} rotation={[0, 0, Math.PI / 2]} material={ACACIA_WOOD}>
          <cylinderGeometry args={[0.05, 0.05, size + 1.2, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function BronzeBasin({ position }: { position: Vec3 }) {
  // 2. Mose 30,18 - bronzes Becken auf bronzenem Fuss
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} material={BRONZE} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 1.0, 10]} />
      </mesh>

      <mesh position={[0, 1.25, 0]} material={BRONZE} castShadow>
        <cylinderGeometry args={[0.8, 0.5, 0.5, 16]} />
      </mesh>

      {/* Wasserfläche */}
      <mesh position={[0, 1.42, 0]} material={WATER}>
        <cylinderGeometry args={[0.74, 0.6, 0.12, 16]} />
      </mesh>

      {/* Beckenrand — Torus flach gelegt (XY-Ebene -> XZ), y = Oberkante Becken */}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={BRONZE}>
        <torusGeometry args={[0.79, 0.035, 8, 24]} />
      </mesh>
    </group>
  );
}

