import * as THREE from 'three';

// Biblical measurements: 1 cubit ≈ 0.45m
// Layout from EAST (entrance) to WEST:
// - Courtyard: z = 0 to z = 22.5m (22.5m deep, 50 cubits) - entrance at z = 0
// - Holy Place: z = 22.5m to z = 31.5m (9m deep, 20 cubits)
// - Holy of Holies: z = 31.5m to z = 36m (4.5m deep, 10 cubits)
// Total length from entrance to back: 36m

export const CUBIT = 0.45;
export const COURTYARD_WIDTH = 50 * CUBIT;  // 22.5m
export const COURTYARD_LENGTH = 50 * CUBIT; // 22.5m
export const COURTYARD_Z_CENTER = 11.25;     // Center of courtyard

export const HOLY_PLACE_SIZE = 20 * CUBIT;           // 9m
export const HOLY_PLACE_Z_START = 22.5;               // After courtyard (z = 22.5)
export const HOLY_PLACE_Z_CENTER = 27;                // Center of holy place (z = 27)

export const HOLY_OF_HOLIES_SIZE = 10 * CUBIT;        // 4.5m
export const HOLY_OF_HOLIES_Z_START = 31.5;           // After holy place (z = 31.5)
export const HOLY_OF_HOLIES_Z_CENTER = 34;            // Center of holy of holies (z = 34)

export function TabernacleFloor() {
  return (
    <group>
      {/* === COURTYARD FLOOR - Golden/tan leather covering === */}
      {/* Position centered at z = 11.25, spanning from z = 0 to z = 22.5 */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, COURTYARD_Z_CENTER]}
        receiveShadow
      >
        <planeGeometry args={[COURTYARD_WIDTH, COURTYARD_LENGTH]} />
        <meshStandardMaterial 
          color={0xD4B896}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      
      {/* Courtyard border lines */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <mesh key={`border-${i}`} position={[x, 0.005, COURTYARD_Z_CENTER]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, COURTYARD_LENGTH]} />
          <meshStandardMaterial color={0x8B7355} />
        </mesh>
      ))}
      
      {/* === HOLY PLACE FLOOR - White linen covered === */}
      {/* Spans from z = 22.5 to z = 31.5, centered at z = 27 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, HOLY_PLACE_Z_CENTER]}
        receiveShadow
      >
        <planeGeometry args={[HOLY_PLACE_SIZE, HOLY_PLACE_SIZE]} />
        <meshStandardMaterial
          color={0xF5F5DC}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* === HOLY OF HOLIES FLOOR - Dark sacred stone === */}
      {/* Spans from z = 31.5 to z = 36, centered at z = 34 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, HOLY_OF_HOLIES_Z_CENTER]}
        receiveShadow
      >
        <planeGeometry args={[HOLY_OF_HOLIES_SIZE, HOLY_OF_HOLIES_SIZE]} />
        <meshStandardMaterial
          color={0x2D2416}
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}