import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ALTAR_Z, HOLY_OF_HOLIES_Z_CENTER, MENORA_X } from './TabernacleFloor';
import { glowTexture, godRayTexture } from '../utils/textures';
import { detectQuality, QUALITY_SETTINGS } from '../utils/quality';

// Licht-Inszenierung (SPEC aaa, Abschnitt d):
// Draussen: warmes Wüstensonnenlicht — EINZIGE Schattenquelle (Budget-Regel 3):
// 1024er Shadowmap, PCFSoft, enges Frustum (±25m) um Vorhof + Stiftshütte.
// Drinnen: nur Menora (flackernd) + Schekinah-Glanz im Allerheiligsten,
// Räucheraltar-Glut, Altarfeuer im Vorhof — alle Punktlichter OHNE Schatten.
// Schekinah: additives Glow-Sprite (Canvas-Radialgradient) über der Lade.
// God-Rays-Fake: 2 additive Gradient-Planes von der Dachdecke auf die Lade.

// Sonnenrichtung: sued-westliche Nachmittagssonne, ~20 Grad Elevation
// (-x = sued, +z = west) — EINE geteilte Konstante fuer Sky, DirectionalLight
// und Env-Sonne (Scene.tsx importiert sie)
export const SUN_DIRECTION: [number, number, number] = [-34, 16, 18];
const COURTYARD_CENTER: [number, number, number] = [0, 0, 22.5];

export function TabernacleLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const shekinahRef = useRef<THREE.Sprite>(null);
  const { scene } = useThree();
  // SPEC F: Shadowmap 512 im 'low'-Tier statt 1024, Frustum bleibt gleich
  const shadowMapSize = QUALITY_SETTINGS[detectQuality()].shadowMapSize;

  // Schekinah "atmet": Opacity pulsiert langsam (keine Allokation pro Frame)
  useFrame((state) => {
    const s = shekinahRef.current;
    if (!s) return;
    (s.material as THREE.SpriteMaterial).opacity =
      0.45 + 0.12 * Math.sin(state.clock.elapsedTime * 0.5);
  });

  // Schatten-Frustum der Sonne um die Vorhof-Mitte zentrieren
  useEffect(() => {
    const sun = sunRef.current;
    if (!sun) return;
    sun.target.position.set(...COURTYARD_CENTER);
    scene.add(sun.target);
    return () => {
      scene.remove(sun.target);
    };
  }, [scene]);

  return (
    <group>
      <ambientLight intensity={0.35} color={0xFFF3E0} />

      {/* Warmes Wüstensonnenlicht — einzige Schattenquelle, PCFSoft
          (512 low / 1024 high, SPEC F), enges Frustum ±25m um Vorhof + Stiftshütte */}
      <directionalLight
        ref={sunRef}
        position={[
          COURTYARD_CENTER[0] + SUN_DIRECTION[0],
          SUN_DIRECTION[1],
          COURTYARD_CENTER[2] + SUN_DIRECTION[2],
        ]}
        intensity={2.2}
        color={0xFFE8C8}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-far={110}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />

      {/* Weiches Himmelsfülllicht */}
      <directionalLight position={[-15, 25, 40]} intensity={0.5} color={0xC9D8E8} />

      {/* Altarfeuer im Vorhof (z = 27) — kein Schatten */}
      <FlickerLight position={[0, 1.9, ALTAR_Z]} baseIntensity={2.5} color={0xFF6600} distance={14} />

      {/* Menora im Heiligen — warm, flackernd (x = -1,1, z = 36) */}
      <FlickerLight position={[MENORA_X, 1.4, 36]} baseIntensity={1.8} color={0xFFB84D} distance={10} />

      {/* Schekinah-Herrlichkeit im Allerheiligsten (z = 42,75):
          Hauptlicht warm-weich, zweites kleines Kernlicht */}
      <pointLight position={[0, 2.6, HOLY_OF_HOLIES_Z_CENTER]} intensity={2.2} color={0xFFF4DC} distance={9} decay={2} />
      <pointLight position={[0, 1.6, HOLY_OF_HOLIES_Z_CENTER]} intensity={0.7} color={0xFFE4B5} distance={5} decay={2} />

      {/* Schekinah-Glow-Sprite über der Lade (additiv, Canvas-Radialgradient) —
          dezent dimensioniert (kein Lens-Flare-Eindruck) */}
      <sprite ref={shekinahRef} position={[0, 2.9, HOLY_OF_HOLIES_Z_CENTER]} scale={[1.9, 1.9, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.55}
        />
      </sprite>

      {/* God-Rays-Fake: 2 additive Gradient-Planes von der Dachdecke (y ~ 4,4)
          bis über die Kapporet (y ~ 1,0)
          (2 Draw Calls, XR-tauglich; Heat-Haze bewusst gestrichen) */}
      <mesh position={[0, 2.7, HOLY_OF_HOLIES_Z_CENTER - 0.5]} rotation={[-0.55, 0, 0]}>
        <planeGeometry args={[1.7, 4.0]} />
        <meshBasicMaterial
          map={godRayTexture}
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 2.7, HOLY_OF_HOLIES_Z_CENTER - 0.55]} rotation={[-0.7, 0, 0]}>
        <planeGeometry args={[1.1, 4.45]} />
        <meshBasicMaterial
          map={godRayTexture}
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function FlickerLight({
  position,
  baseIntensity,
  color,
  distance,
}: {
  position: [number, number, number];
  baseIntensity: number;
  color: number;
  distance: number;
}) {
  const ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      const flicker =
        Math.sin(t * 9.7) * 0.12 +
        Math.sin(t * 15.3) * 0.08 +
        Math.sin(t * 23.1) * 0.05;
      ref.current.intensity = baseIntensity * (1 + flicker);
    }
  });

  return (
    <pointLight
      ref={ref}
      position={position}
      intensity={baseIntensity}
      color={color}
      distance={distance}
      decay={2}
    />
  );
}
