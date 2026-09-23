// Biblische Masse: 1 Elle = 0,45m (SPEC docs/SPEC-originalgetreue.md — NICHT angetastet)// Ziel-Layout: Ost (Eingang/Tor) = z = 0, West = z = +45m
// Vorhof: 100 x 50 Ellen (45m x 22,5m) - Ex 27,18, Wände 5 Ellen (2,25m)
// Stiftshütte im Vorhof am Westende: z = 31,5 ... 45m
//   Heiligen: z = 31,5 ... 40,5 (20 Ellen, 9m)
//   Allerheiligstes: z = 40,5 ... 45 (10 Ellen, 4,5m)
//   Breite 10 Ellen (4,5m), Höhe 10 Ellen (4,5m) - Ex 26,15-30

import { EARTH } from '../utils/materials';

export const CUBIT = 0.45;

// Vorhof (Ex 27,9-19)
export const COURTYARD_WIDTH = 50 * CUBIT;   // 22,5m (x: -11,25 ... +11,25)
export const COURTYARD_LENGTH = 100 * CUBIT; // 45m (z: 0 ... 45)
export const COURTYARD_Z_CENTER = COURTYARD_LENGTH / 2; // 22,5
export const COURTYARD_WALL_HEIGHT = 5 * CUBIT;         // 2,25m
export const GATE_WIDTH = 20 * CUBIT;                   // 9m Tor an der Ostseite (z = 0)

// Stiftshütte (Ex 26,15-30)
export const TENT_WIDTH = 10 * CUBIT;   // 4,5m
export const TENT_HEIGHT = 10 * CUBIT;  // 4,5m
export const TENT_LENGTH = 30 * CUBIT;  // 13,5m
export const TENT_Z_START = 31.5;
export const TENT_Z_END = 45;
export const TENT_Z_CENTER = (TENT_Z_START + TENT_Z_END) / 2; // 38,25

// Heiligen (Ex 26 / 40)
export const HOLY_PLACE_SIZE = TENT_WIDTH;         // 4,5m Breite
export const HOLY_PLACE_Z_START = 31.5;
export const HOLY_PLACE_Z_END = 40.5;
export const HOLY_PLACE_Z_CENTER = 36;
export const MENORA_X = -1.1;   // Südseite (Ex 40,24)
export const TABLE_X = 1.1;     // Nordseite (Ex 40,22)
export const FURNITURE_Z = 36;
export const INCENSE_ALTAR_Z = 39.7; // direkt vor dem Vorhang (Ex 40,5)

// Allerheiligstes (Ex 25,10-22 / 26,31-34)
export const HOLY_OF_HOLIES_SIZE = 10 * CUBIT;     // 4,5m Würfel
export const HOLY_OF_HOLIES_Z_START = 40.5;
export const HOLY_OF_HOLIES_Z_END = 45;
export const HOLY_OF_HOLIES_Z_CENTER = 42.75;      // Mitte des Würfels

// Vorhof-Einrichtungen (Ex 40,6-7)
export const ALTAR_Z = 27;    // Brandopferaltar auf der Mittellinie
export const BASIN_Z = 29.5;  // Waschbecken zwischen Altar und Stiftshütte

export function TabernacleFloor() {
  return (
    <group>
      {/* Vorhof-Boden - feste Erde, z = 0 ... 45 (auch in der Stiftshütte,
          die Bibel kennt keinen Innenboden-Belag). Der Wüstensand um den
          Vorhof kommt als Dünen-Plane in Scene.tsx (1 Draw Call). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, COURTYARD_Z_CENTER]}
        material={EARTH}
        receiveShadow
      >
        <planeGeometry args={[COURTYARD_WIDTH, COURTYARD_LENGTH]} />
      </mesh>
    </group>
  );
}
