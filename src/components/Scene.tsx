import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Sparkles, Environment } from '@react-three/drei';
import { ALTAR_Z } from './TabernacleFloor';
import { cloudTexture, envGradientTexture } from '../utils/textures';
import { SAND } from '../utils/materials';
import { TabernacleFloor } from './TabernacleFloor';
import { TabernacleCourtyard } from './TabernacleCourtyard';
import { HolyPlace } from './HolyPlace';
import { HolyOfHolies } from './HolyOfHolies';
import { TabernacleLighting, SUN_DIRECTION } from './TabernacleLighting';
import { CampIsrael } from './CampIsrael';

// Umgebung (SPEC aaa, Abschnitt c) — eine Szene, eine Stimmung:
// - Himmel: drei Sky (Preetham) mit Wüstenwerten, Sonne tief passend zur Sonne der Lichtinszenierung
// - Wolken: 8 Billboard-Sprites (Canvas-Textur), langsam driftend — KEIN drei-Clouds (Volumen = teuer)
// - Dünen: EINE 64x64-Plane mit Vertex-Noise ausserhalb des Vorhofs, 1 Draw Call, kein Schatten
// - Staub: drei Sparkles-Felder (dezent) in Vorhof + Stiftshütte
// - Heat-Haze: bewusst gestrichen (Screen-Space-Distortion zu teuer für XR-Budget)
// - Wolkensäule/Feuersäule: NEIN (Ex 40,34-38: Zeichen, nicht Dauerzustand) — Shekinah genügt
// - Environment: generierte Gradient-Szene (PMREM) statt Netz-HDR — kein Blocked-Load

// Sonnenrichtung: geteilte Konstante aus TabernacleLighting (Sued-West, tief)

// 8 Wolken hoch am Himmel, gestreut
const CLOUDS: [number, number, number][] = [
  [-140, 72, -60],
  [90, 84, -110],
  [170, 66, 40],
  [-90, 90, 120],
  [40, 78, 190],
  [-180, 70, 160],
  [130, 88, -40],
  [-30, 82, -170],
];

function Clouds() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i];
      const speed = 0.55 + (i % 3) * 0.3;
      // langsame Drift entlang x, Wrap im Dunstbereich (weit weg, kein sichtbarer Sprung)
      c.position.x = -240 + ((CLOUDS[i][0] + 240 + t * speed) % 480);
    }
  });

  return (
    <group ref={group}>
      {CLOUDS.map((p, i) => {
        const sx = 55 + (i % 3) * 22;
        const mirror = i % 2 === 1; // x-Scale spiegeln -> keine identischen Zwillinge
        return (
          <sprite key={`cloud-${i}`} position={p} scale={[mirror ? -sx : sx, 20 + (i % 2) * 9, 1]}>
            <spriteMaterial
              map={cloudTexture}
              transparent
              opacity={0.55 + (i % 3) * 0.1}
              rotation={(i * 1.37) % Math.PI}
              depthWrite={false}
              fog={false}
              color="#F2E6CE"
            />
          </sprite>
        );
      })}
    </group>
  );
}

function Dunes() {
  // Eine Low-Poly-Plane (64x64 Segmente), Vertex-Noise ausserhalb des Vorhofs
  // (Radius ~80-150 m), Sandtextur, receiveShadow aus — 1 Draw Call.
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(480, 480, 64, 64);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      if (r < 45) continue; // Vorhof-Umfeld bleibt flach
      const falloff = Math.min(1, (r - 45) / 25);
      const h =
        (Math.sin(x * 0.055) * Math.cos(y * 0.045) * 2.2 +
          Math.sin(x * 0.021 + y * 0.033) * 3.1 +
          Math.sin((x + y) * 0.11) * 0.5) *
        falloff;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} material={SAND} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 22.5]} />
  );
}

// Debug-Kamera-Hook: ?debugcam=1 haengt camera+scene an window (Verifikation/Tests).
function DebugCamHook() {
  const { camera, scene } = useThree();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('debugcam') === '1') {
      (window as unknown as Record<string, unknown>).__CAMERA = camera;
      (window as unknown as Record<string, unknown>).__SCENE = scene;
    }
  }, [camera, scene]);
  return null;
}

export function Scene() {
  return (
    <group>
      <DebugCamHook />
      {/* === WÜSTENHIMMEL (Preetham-Sky, sonniger staubiger Nachmittag) === */}
      <Sky
        distance={400}
        sunPosition={SUN_DIRECTION}
        turbidity={5}
        rayleigh={1.6}
        mieCoefficient={0.002}
        mieDirectionalG={0.75}
      />

      {/* === WARMES STAUBIGES NEBELN an der Diorama-Horizontlinie === */}
      <fog attach="fog" args={[0xCFC2A6, 60, 260]} />

      {/* === ENVIRONMENT-MAP als ERZEUGTE PMREM-Szene (kein Netz-Download):
            Gradient-Himmel + helle Sonnenkugel für Metallreflexe === */}
      <Environment resolution={64} frames={1}>
        <mesh>
          <sphereGeometry args={[50, 16, 16]} />
          <meshBasicMaterial map={envGradientTexture} side={THREE.BackSide} />
        </mesh>
        <mesh position={SUN_DIRECTION} scale={7}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={[1.7, 1.45, 1.1]} />
        </mesh>
      </Environment>

      {/* === DÜNEN (1 Draw Call, kein Schatten) === */}
      <Dunes />

      {/* === WOLKEN (8 Billboards, langsam driftend) === */}
      <Clouds />

      {/* === STAUB IM WIND: dezente Sparkles-Felder ===
          Vorhof-Feld endet vor der Stiftshuette (z <= 30), Zelt-Feld nur im
          Heiligen (z = 31,7 ... 40,3, sehr dezent), Allerheiligstes OHNE Staub */}
      <Sparkles
        count={55}
        scale={[20, 4, 30]}
        position={[0, 2, 15]}
        size={2}
        speed={0.15}
        opacity={0.1}
        color="#E8DCC8"
        noise={0.5}
      />
      <Sparkles
        count={40}
        scale={[4.2, 4, 8.6]}
        position={[0, 2.2, 36]}
        size={1}
        speed={0.12}
        opacity={0.1}
        color="#E8DCC8"
        noise={0.4}
      />
      <Sparkles
        count={50}
        scale={[2.5, 2.5, 2.5]}
        position={[0, 1.6, ALTAR_Z]}
        size={2}
        speed={0.5}
        opacity={0.55}
        color="#FF8844"
        noise={0.3}
      />

      {/* === CAMP ISRAEL (deutbare Zutat nach 4. Mose 2, entfernbar) === */}
      <CampIsrael />

      {/* === LICHT-INSZENIERUNG === */}
      <TabernacleLighting />

      {/* === VORHOF === */}
      <TabernacleFloor />
      <TabernacleCourtyard />

      {/* === HEILIGEN === */}
      <HolyPlace />

      {/* === ALLERHEILIGSTES === */}
      <HolyOfHolies />
    </group>
  );
}
