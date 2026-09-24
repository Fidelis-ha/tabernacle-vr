import * as THREE from 'three';
import {
  CUBIT,
  TENT_WIDTH,
  TENT_HEIGHT,
  HOLY_OF_HOLIES_Z_START,
  HOLY_OF_HOLIES_Z_END,
} from './TabernacleFloor';
import { SideBeamWall, HOLY_WALL_SPLIT_Z } from './HolyPlace';
import { GOLD, SILVER, VEIL_MAT } from '../utils/materials';
import { goldTexture, goldRoughTexture } from '../utils/textures';
import { Instanced, type InstanceTransform, type Vec3 } from '../utils/instancing';

// Allerheiligstes nach Ex 25,10-22 / 26,31-34 / SPEC:
// Würfel 4,5 x 4,5 x 4,5m (10 Ellen), z = 40,5 ... 45
// Wände wie die Stiftshütte: goldüberzogene Akazienbalken
// (Westwand nach Ex 26,22-25: 6 Balken + 2 L-förmige Eckbalken = 8, 16 Silbersockel)
// Vorhang (Parochet): 4 Farben mit Cherubim-Wirkerei als Canvas-Textur,
// an 4 goldenen Säulen auf 4 Silbersockeln (Ex 26,32) bei z = 40,5
// Lade: 2,5 x 1,5 x 1,5 Ellen, 4 Ringe an den UNTEREN Ecken, Tragstangen,
// massiv goldene Kapporet, grosse Cherubim mit ausgebreiteten Flügeln (~1 Elle hoch)

const HALF_W = TENT_WIDTH / 2; // 2,25m
const VEIL_Z = HOLY_OF_HOLIES_Z_START; // 40,5

// Modul-Geometrien (Budget-Regel 8)
const westBoardGeo = new THREE.BoxGeometry(1, TENT_HEIGHT - 0.2, 0.12); // Breite via scale
const westSocketGeo = new THREE.BoxGeometry(0.2, 0.2, 0.28);
const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
const veilPedestalGeo = new THREE.BoxGeometry(0.28, 0.2, 0.28);
const veilShaftGeo = new THREE.CylinderGeometry(0.045, 0.055, TENT_HEIGHT, 10);
const veilCapGeo = new THREE.CylinderGeometry(0.065, 0.04, 0.12, 10);

// Lade-Ringe (B5: sichtbarer Ring-Ausschnitt — 3/4-Torus, die Tragstange
// tritt durch die Oeffnung) + Kronen-Torus am oberen Rand (elliptisch
// skaliert auf den Laderand)
const arkRingGeo = new THREE.TorusGeometry(0.055, 0.018, 6, 12, Math.PI * 1.5);
const arkRingSocketGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.022, 8); // dunkle Fassung im Ring
const arkCrownGeo = new THREE.TorusGeometry(1, 0.022, 6, 36);
const arkCrownStepGeo = new THREE.TorusGeometry(1, 0.013, 6, 36); // 2 schmale Stufungsringe

// Lade-Doppellage (SPEC A): untere Lage etwas dunkler patiniert
// (Holz unter Gold ablesbar), dunkle Akzent-Fuge als Geometrie-Streifen
const ARK_GOLD_LOWER = new THREE.MeshStandardMaterial({
  color: 0xA8842C,
  metalness: 1.0,
  roughness: 0.55,
  roughnessMap: goldRoughTexture,
  envMapIntensity: 0.8,
  bumpMap: goldTexture,
  bumpScale: 0.06,
});
const ARK_SEAM = new THREE.MeshStandardMaterial({ color: 0x3A2A14, roughness: 0.9 });

export function HolyOfHolies() {
  return (
    <group>
      {/* === GOLDÜBERZOGENE AKAZIENBALKEN (Allerheiligstes) === */}
      {/* Süd- & Nordseite, z = 40,275 ... 45 */}
      <SideBeamWall x={-HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      <SideBeamWall x={HALF_W} zStart={HOLY_WALL_SPLIT_Z} zEnd={HOLY_OF_HOLIES_Z_END} />
      {/* Westwand: 6 Balken + 2 L-förmige Eckbalken (Ex 26,22-25) */}
      <WestBeamWall />

      {/* === VORHANG (PAROCHET) auf 4 goldenen Säulen (Ex 26,31-33) === */}
      <VeilWithPillars />

      {/* === SCHEKINAH-HERRLICHKEIT über der Lade: Licht + Glow-Sprite +
           God-Rays-Fake leben in TabernacleLighting === */}

      {/* === BUNDESLADE (Ex 25,10-22) === */}
      <ArkOfCovenant position={[0, 0, HOLY_OF_HOLIES_Z_START + HALF_W]} />
    </group>
  );
}

function WestBeamWall() {
  // Westwand nach Ex 26,22-25: SECHS Balken über die innere Breite + ZWEI
  // L-förmige Eckbalken = 8 Balken, 16 Silbersockel (je 2 pro Balken)
  const count = 6;
  const spacing = TENT_WIDTH / count;
  const backZ = HOLY_OF_HOLIES_Z_END; // 45
  const plankLen = spacing * 0.93;
  // Ex 26,27-28: die MITTLERE der 5 Stangen läuft durch, die anderen 4 sind
  // halb so lang und treffen sich in der Mitte
  const barYs = [0.55, 1.4, TENT_HEIGHT / 2, 3.1, 3.95];

  const boards: InstanceTransform[] = [];
  const sockets: InstanceTransform[] = [];
  for (let i = 0; i < count; i++) {
    const x = -HALF_W + spacing * (i + 0.5);
    boards.push({ position: [x, TENT_HEIGHT / 2 + 0.2, backZ - 0.06], scale: [plankLen, 1, 1] });
    for (const dx of [-0.14, 0.14]) {
      sockets.push({ position: [x + dx, 0.1, backZ - 0.06] });
    }
  }

  // 5 Stangen entlang der Westwand (in x-Richtung)
  const bars: InstanceTransform[] = [];
  for (let bi = 0; bi < barYs.length; bi++) {
    const y = barYs[bi];
    if (bi === 2) {
      bars.push({
        position: [0, y, backZ - 0.12],
        rotation: [0, 0, Math.PI / 2],
        scale: [1, TENT_WIDTH, 1],
      });
    } else {
      for (const half of [-1, 1]) {
        bars.push({
          position: [half * (TENT_WIDTH / 4 + 0.015), y, backZ - 0.12],
          rotation: [0, 0, Math.PI / 2],
          scale: [1, TENT_WIDTH / 2, 1],
        });
      }
    }
  }

  return (
    <group>
      {/* Balken (grosse Silhouette) + Silbersockel (Ex 26,21) */}
      <Instanced geometry={westBoardGeo} material={GOLD} transforms={boards} castShadow receiveShadow />
      <Instanced geometry={westSocketGeo} material={SILVER} transforms={sockets} />
      <Instanced geometry={barGeo} material={GOLD} transforms={bars} />

      {/* 2 L-förmige Eckbalken (Ex 26,23-25 "doppelte Balken"): je ein Schenkel
          an der Westfläche, einer umgreift das Seitenwandende von aussen */}
      {[-1, 1].map((side) => (
        <group key={`corner-${side}`}>
          <mesh
            position={[side * (HALF_W + 0.03), TENT_HEIGHT / 2 + 0.2, backZ - 0.06]}
            material={GOLD}
            castShadow
          >
            <boxGeometry args={[0.3, TENT_HEIGHT - 0.2, 0.12]} />
          </mesh>
          <mesh
            position={[side * (HALF_W + 0.12), TENT_HEIGHT / 2 + 0.2, backZ - 0.28]}
            material={GOLD}
            castShadow
          >
            <boxGeometry args={[0.12, TENT_HEIGHT - 0.2, 0.5]} />
          </mesh>
          {/* Silbersockel unter den Eckbalken (je 2 pro Ecke) */}
          <mesh position={[side * (HALF_W + 0.03), 0.1, backZ - 0.06]} material={SILVER}>
            <boxGeometry args={[0.3, 0.2, 0.28]} />
          </mesh>
          <mesh position={[side * (HALF_W + 0.12), 0.1, backZ - 0.28]} material={SILVER}>
            <boxGeometry args={[0.28, 0.2, 0.36]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VeilWithPillars() {
  // 4-farbiger Vorhang mit Cherubim-Wirkerei (Canvas-Textur), an 4 goldenen
  // Säulen mit Silbersockeln (Ex 26,31-33)
  const veilH = TENT_HEIGHT - 0.05;
  const pillarXs = [-1.6875, -0.5625, 0.5625, 1.6875];

  const pedestals: InstanceTransform[] = [];
  const shafts: InstanceTransform[] = [];
  const caps: InstanceTransform[] = [];
  for (const x of pillarXs) {
    pedestals.push({ position: [x, 0.1, VEIL_Z + 0.06] });
    shafts.push({ position: [x, TENT_HEIGHT / 2 + 0.1, VEIL_Z + 0.06] });
    caps.push({ position: [x, TENT_HEIGHT + 0.16, VEIL_Z + 0.06] });
  }

  return (
    <group>
      <Instanced geometry={veilPedestalGeo} material={SILVER} transforms={pedestals} />
      <Instanced geometry={veilShaftGeo} material={GOLD} transforms={shafts} castShadow />
      <Instanced geometry={veilCapGeo} material={GOLD} transforms={caps} />

      {/* Vorhang: EINE Plane mit 4-Farben-Cherubim-Textur (Ex 26,31) */}
      <mesh position={[0, veilH / 2 + 0.05, VEIL_Z - 0.02]} material={VEIL_MAT}>
        <planeGeometry args={[TENT_WIDTH, veilH]} />
      </mesh>
    </group>
  );
}

function ArkOfCovenant({ position }: { position: Vec3 }) {
  // 2. Mose 25,10-22 - 2,5 x 1,5 x 1,5 Ellen, Akazien mit Gold überzogen
  const length = 2.5 * CUBIT; // 1,125m
  const width = 1.5 * CUBIT;  // 0,675m
  const height = 1.5 * CUBIT; // 0,675m
  const footH = 0.06;
  const kaporetY = footH + height + 0.045;
  // Doppellage (SPEC A): untere Lage dunkler, sichtbare Fugen-Naht dazwischen
  const lowerH = height * 0.55;
  const upperH = height - lowerH;
  const seamH = 0.012;
  const upperY = footH + lowerH + seamH + upperH / 2;

  // 4 goldene Ringe an den 4 UNTEREN Ecken (Ex 25,12)
  const ringPositions: Vec3[] = [
    [-length / 2 + 0.08, footH + 0.12, width / 2 + 0.035],
    [length / 2 - 0.08, footH + 0.12, width / 2 + 0.035],
    [-length / 2 + 0.08, footH + 0.12, -width / 2 - 0.035],
    [length / 2 - 0.08, footH + 0.12, -width / 2 - 0.035],
  ];

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Ladekörper in ZWEI Bretter-Lagen (SPEC A): unten dunkler patiniert */}
      <mesh position={[0, footH + lowerH / 2, 0]} material={ARK_GOLD_LOWER} castShadow receiveShadow>
        <boxGeometry args={[length, lowerH, width]} />
      </mesh>
      <mesh position={[0, upperY, 0]} material={GOLD} castShadow receiveShadow>
        <boxGeometry args={[length, upperH, width]} />
      </mesh>
      {/* Sichtbare horizontale Fugen-Naht: dünne dunkle Geometrie-Streifen
          (nicht Textur) rund um den Korpus */}
      <mesh position={[0, footH + lowerH + seamH / 2, 0]} material={ARK_SEAM}>
        <boxGeometry args={[length + 0.004, seamH, width + 0.004]} />
      </mesh>

      {/* Goldene Krönung am oberen Rand */}
      <mesh position={[0, footH + height - 0.03, 0]} material={GOLD}>
        <boxGeometry args={[length + 0.05, 0.05, width + 0.05]} />
      </mesh>

      {/* Goldkranz als gedrechselte WELLE (SPEC A): Haupt-Torus + 2 schmale
          Ringe leicht versetzt (gestuft), elliptisch auf den Ladeumriss */}
      <mesh
        position={[0, footH + height + 0.008, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[length / 2 + 0.03, width / 2 + 0.03, 1]}
        geometry={arkCrownGeo}
        material={GOLD}
      />
      <mesh
        position={[0, footH + height + 0.026, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[length / 2 + 0.018, width / 2 + 0.018, 1]}
        geometry={arkCrownStepGeo}
        material={GOLD}
      />
      <mesh
        position={[0, footH + height - 0.012, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[length / 2 + 0.042, width / 2 + 0.042, 1]}
        geometry={arkCrownStepGeo}
        material={GOLD}
      />

      {/* 4 Ringe: echte rundgebogene Ösen (3/4-Torus), innen dunkle Fassung
          als Durchbruchs-Andeutung — die Stangen liegen sichtbar IN den Ösen */}
      {ringPositions.map((pos, i) => (
        <group key={`ring-${i}`} position={pos} rotation={[0, Math.PI / 2, i * Math.PI]}>
          <mesh geometry={arkRingGeo} material={GOLD} />
          <mesh geometry={arkRingSocketGeo} material={ARK_SEAM} />
        </group>
      ))}

      {/* Tragstangen - Akazien mit Gold überzogen, bleiben eingesteckt
          (Ex 25,13-15) und laufen durch die Ring-Ösen (gleiche Höhe y) */}
      {[width / 2 + 0.035, -width / 2 - 0.035].map((z, i) => (
        <mesh key={`stave-${i}`} position={[0, footH + 0.12, z]} rotation={[0, 0, Math.PI / 2]} material={GOLD}>
          <cylinderGeometry args={[0.03, 0.03, length + 0.7, 8]} />
        </mesh>
      ))}

      {/* Kapporet (Gnadenstuhl) - massiv Gold (Ex 25,17), leicht ÜBERSTEHEND
          (je 0,05 m, SPEC A) */}
      <mesh position={[0, kaporetY, 0]} material={GOLD} castShadow>
        <boxGeometry args={[length + 0.1, 0.09, width + 0.1]} />
      </mesh>

      {/* Abschliessender Rand der Kapporet: flacher Torus, elliptisch
          auf den überstehenden Umriss (SPEC A) */}
      <mesh
        position={[0, kaporetY + 0.045, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[length / 2 + 0.05, width / 2 + 0.05, 1]}
        geometry={arkCrownStepGeo}
        material={GOLD}
      />

      {/* 2 grosse CHERUBIM - aus EINEM Stück mit der Kapporet (Ex 25,19),
          Flügel berühren einander in der Mitte (Ex 25,20) */}
      <Cherub position={[-0.32, kaporetY + 0.045, 0]} facing={1} />
      <Cherub position={[0.32, kaporetY + 0.045, 0]} facing={-1} />
    </group>
  );
}

function Cherub({ position, facing }: { position: Vec3; facing: 1 | -1 }) {
  // Getriebenes Gold, aus einem Stück mit der Kapporet (Ex 25,18):
  // Füsse als 2 kleine Goldkugeln am Deckel, Körper leicht nach vorn geneigt,
  // Kopf vorgebeugt (Blicken nach unten). Flügel 2-segmentig; die inneren
  // Segmente reichen bis x = 0 (Mitte über der Lade) und BERÜHREN sich dort
  // tatsächlich (Ex 25,20): Cherub bei x = ∓0,32, Wurzel an der Körperkante,
  // Spitze bei lokal ±0,32 -> Welt x = 0.
  const wingInner = 0.56; // Wurzel lokal ±0,06 + horizontale Spannweite -> Spitze ~2cm UEBER x=0 hinaus:
                          // echte UEBERLAPPUNG in der Mitte (Ex 25,20 "Spitzen einander entgegen"), nicht nur Kante an Kante
  const wingOuter = 0.55; // Flügel zur Wand
  const innerAngle = THREE.MathUtils.degToRad(60); // Steigwinkel innerer Flügel
  const outerAngle = THREE.MathUtils.degToRad(50);
  // Innerer Flügel: Wurzel an der inneren Körperkante, steil zur Mitte.
  // Die beiden inneren Flügel überlappen sich in der Mitte (Ex 25,20).
  const innerCenterX = facing * (0.06 + (wingInner / 2) * Math.cos(innerAngle));
  const innerCenterY = 0.32 + (wingInner / 2) * Math.sin(innerAngle);
  // Äusserer Flügel: an der äusseren Körperkante, nach aussen ansteigend
  const outerCenterX = -facing * (0.08 + (wingOuter / 2) * Math.cos(outerAngle));
  const outerCenterY = 0.38 + (wingOuter / 2) * Math.sin(outerAngle);
  const innerRotation = Math.PI / 2 - facing * (Math.PI / 2 - innerAngle);
  const outerRotation = Math.PI / 2 + facing * (Math.PI / 2 - outerAngle);

  return (
    <group position={position}>
      {/* 2 kleine Standflächen (Füsse) am Deckel — aus einem Stück geschlagen */}
      <mesh position={[-0.05, 0.012, 0]} material={GOLD}>
        <sphereGeometry args={[0.022, 8, 8]} />
      </mesh>
      <mesh position={[0.05, 0.012, 0]} material={GOLD}>
        <sphereGeometry args={[0.022, 8, 8]} />
      </mesh>

      {/* Körper, leicht nach vorn (zum Gegenüber) geneigt */}
      <mesh position={[facing * 0.015, 0.18, 0]} rotation={[0, 0, -facing * 0.09]} material={GOLD} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.36, 10]} />
      </mesh>

      {/* Kopf, würdevoll ohne detaillierte Menschengesichter — leicht
          vorgebeugt (Blicken nach unten) */}
      <mesh position={[facing * 0.03, 0.405, 0]} rotation={[0, 0, -facing * 0.35]} material={GOLD}>
        <sphereGeometry args={[0.06, 10, 10]} />
      </mesh>

      {/* Innerer Flügel - steil, zur Mitte ausgebreitet: dünne Fläche,
          2 Segmente mit Knick über innerer + äusserer Fittich (B5).
          Die Spitze überragt x=0 um ~2cm — zusammen mit dem Mittelstück
          unten ist die BERÜHRUNG (Ex 25,20) aus jeder Distanz lesbar. */}
      <mesh position={[innerCenterX, innerCenterY, 0]} rotation={[0, 0, innerRotation]} material={GOLD}>
        <boxGeometry args={[wingInner, 0.014, 0.3]} />
      </mesh>

      {/* Mittelstück: schmaler Gold-Streifen exakt über x=0, verbindet die
          beiden Flügel-Spitzen (Spitzen berühren einander, Ex 25,20).
          Nur beim Cherub mit facing=1 gerendert (sonst doppelt). */}
      {facing === 1 && (
        <mesh position={[0, innerCenterY, 0]} rotation={[0, 0, innerAngle]} material={GOLD}>
          <boxGeometry args={[0.14, 0.013, 0.28]} />
        </mesh>
      )}

      {/* Äusserer Flügel - nach oben/aussen zur Wand, gegenläufiger Knick */}
      <mesh position={[outerCenterX, outerCenterY, 0]} rotation={[0, 0, outerRotation]} material={GOLD}>
        <boxGeometry args={[wingOuter, 0.014, 0.3]} />
      </mesh>

      {/* Gefieder-Schichten zur Würde: zweite, leicht verkippte Fläche
          pro Segment (wirkt gebogen, B5) */}
      <mesh position={[innerCenterX, innerCenterY - 0.035, 0.02]} rotation={[0.06, 0, innerRotation + facing * 0.14]} material={GOLD}>
        <boxGeometry args={[wingInner * 0.85, 0.012, 0.2]} />
      </mesh>
      <mesh position={[outerCenterX, outerCenterY - 0.035, 0.02]} rotation={[-0.06, 0, outerRotation - facing * 0.12]} material={GOLD}>
        <boxGeometry args={[wingOuter * 0.85, 0.012, 0.2]} />
      </mesh>
    </group>
  );
}
