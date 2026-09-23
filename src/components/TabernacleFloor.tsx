// Biblical measurements: 1 cubit = 0.45m
// TARGET layout (SPEC docs/SPEC-originalgetreue.md):
// East (entrance/gate) = z = 0, West = z = +45m
// Courtyard: 100 x 50 cubits (45m x 22.5m) - Ex 27:18, walls 5 cubits (2.25m) high
// Tabernacle inside courtyard at west end: z = 31.5 ... 45m
//   Holy Place: z = 31.5 ... 40.5 (20 cubits, 9m)
//   Holy of Holies: z = 40.5 ... 45 (10 cubits, 4.5m)
//   Width 10 cubits (4.5m), height 10 cubits (4.5m) - Ex 26:15-30

export const CUBIT = 0.45;

// Courtyard (Ex 27:9-19)
export const COURTYARD_WIDTH = 50 * CUBIT;   // 22.5m (x: -11.25 ... +11.25)
export const COURTYARD_LENGTH = 100 * CUBIT; // 45m (z: 0 ... 45)
export const COURTYARD_Z_CENTER = COURTYARD_LENGTH / 2; // 22.5
export const COURTYARD_WALL_HEIGHT = 5 * CUBIT;         // 2.25m
export const GATE_WIDTH = 20 * CUBIT;                   // 9m gate on east side (z = 0)

// Tabernacle tent (Ex 26:15-30)
export const TENT_WIDTH = 10 * CUBIT;   // 4.5m
export const TENT_HEIGHT = 10 * CUBIT;  // 4.5m
export const TENT_LENGTH = 30 * CUBIT;  // 13.5m
export const TENT_Z_START = 31.5;
export const TENT_Z_END = 45;
export const TENT_Z_CENTER = (TENT_Z_START + TENT_Z_END) / 2; // 38.25

// Holy Place (Ex 26 / 40)
export const HOLY_PLACE_SIZE = TENT_WIDTH;         // 4.5m width
export const HOLY_PLACE_Z_START = 31.5;
export const HOLY_PLACE_Z_END = 40.5;
export const HOLY_PLACE_Z_CENTER = 36;
export const MENORA_X = -1.1;   // south side (Ex 40:24)
export const TABLE_X = 1.1;     // north side (Ex 40:22)
export const FURNITURE_Z = 36;
export const INCENSE_ALTAR_Z = 39.7; // directly before the veil (Ex 40:5)

// Holy of Holies (Ex 25:10-22 / 26:31-34)
export const HOLY_OF_HOLIES_SIZE = 10 * CUBIT;     // 4.5m cube
export const HOLY_OF_HOLIES_Z_START = 40.5;
export const HOLY_OF_HOLIES_Z_END = 45;
export const HOLY_OF_HOLIES_Z_CENTER = 42.75;      // center of the cube

// Courtyard furnishings (Ex 40:6-7)
export const ALTAR_Z = 27;    // burnt offering altar on the midline
export const BASIN_Z = 29.5;  // laver between altar and tabernacle

export function TabernacleFloor() {
  return (
    <group>
      {/* === DESERT GROUND around the courtyard === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 20]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={0xC2A878} roughness={1.0} metalness={0.0} />
      </mesh>

      {/* === COURTYARD FLOOR - packed earth, z = 0 ... 45 (also inside the tent,
           the Bible knows no interior floor covering) === */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, COURTYARD_Z_CENTER]}
        receiveShadow
      >
        <planeGeometry args={[COURTYARD_WIDTH, COURTYARD_LENGTH]} />
        <meshStandardMaterial color={0x8B7355} roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  );
}
