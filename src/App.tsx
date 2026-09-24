import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { XR, XROrigin, useXR, useXRControllerLocomotion, createXRStore } from '@react-three/xr';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { GameStateManager, GameUI, useGameStore, ensureAudioStarted } from './components/GameUI';
import { QUALITY_SETTINGS } from './utils/quality';

// Create XR store with teleport enabled
const store = createXRStore({
  controller: { teleportPointer: true },
  hand: { teleportPointer: true }
});

// Postprocessing (SPEC aaa, a): Bloom + Vignette NUR ausserhalb XR.
// In XR gilt stattdessen: ACES-Tonemapping + Foveation (siehe onCreated).
// SPEC F: im 'low'-Tier komplett AUS (auch ausserhalb XR).
function PostFX() {
  const session = useXR((s) => s.session);
  const quality = useGameStore((s) => s.quality);
  if (session || !QUALITY_SETTINGS[quality].postFX) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.4} mipmapBlur />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}

// Touch device detection: coarse pointer (phones/tablets) OR any touch support
function useIsTouchDevice(): boolean {
  const [isTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse || (navigator.maxTouchPoints ?? 0) > 0;
  });
  return isTouch;
}

// Sync the XR session state into the DOM-reachable zustand store
function XRSessionSync() {
  const session = useXR((s) => s.session);
  const setXrActive = useGameStore((s) => s.setXrActive);
  useEffect(() => {
    setXrActive(!!session);
    return () => setXrActive(false);
  }, [session, setXrActive]);
  return null;
}

// SPEC-perf-stoffe A3 — Movement-Regression (Sketchfab-Pattern): useFrame liest
// die Kameraposition (Weltkoordinaten — in XR steuert der XROrigin die Kamera),
// bei Bewegung performance.regress() pro Frame. WICHTIG: Diese R3F-Version
// multipliziert performance.current NICHT automatisch in den dpr — deshalb
// wird die Skalierung hier explizit angewendet: store.setDpr(baseDpr * current).
// performance.current springt bei regress() auf min (0.5) und nach dem Debounce
// (= Stillstand) zurueck auf 1 — dpr folgt automatisch.
function MovementRegress({ baseDpr }: { baseDpr: number }) {
  const performance = useThree((s) => s.performance);
  const current = useThree((s) => s.performance.current);
  const setStoreDpr = useThree((s) => s.setDpr);
  const camera = useThree((s) => s.camera);
  const last = useRef(new THREE.Vector3());
  const curr = useRef(new THREE.Vector3());

  useEffect(() => {
    setStoreDpr(baseDpr * current);
  }, [baseDpr, current, setStoreDpr]);

  useFrame(() => {
    camera.getWorldPosition(curr.current);
    if (curr.current.distanceToSquared(last.current) > 0.0001) {
      performance.regress();
      last.current.copy(curr.current);
    }
  });
  return null;
}

// SPEC-perf-stoffe A4 — Shader-Precompile: nach dem ersten Frame alle
// Programme der Szene vorkompilieren (renderer.compileAsync, r160+; Fallback
// compile), damit beim Bewegungs-Regress/dpr-Wechsel keine Hitches entstehen.
function PrecompileShaders() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          const compiled = gl.compileAsync(scene, camera) as unknown;
          if (compiled instanceof Promise) void compiled.catch(() => {});
        } catch {
          try {
            gl.compile(scene, camera);
          } catch {
            /* Precompile ist best-effort */
          }
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [gl, scene, camera]);
  return null;
}

// VR enter button - only rendered when the browser reports immersive-vr support
function VRButton() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
    if (!xr) return;
    xr.isSessionSupported('immersive-vr')
      .then((ok) => { if (!cancelled) setSupported(ok); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!supported) return null;

  return (
    <div style={{
      position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 100
    }}>
      <button
        onClick={() => {
          ensureAudioStarted(); // Audio-Init beim VR-Eintritt (User-Gesture)
          store.enterVR();
        }}
        style={{
          padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 'bold',
          background: 'linear-gradient(135deg, #c9a84c 0%, #e8d5b7 100%)',
          color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(201, 168, 76, 0.4)'
        }}
      >
        In VR eintreten
      </button>
    </div>
  );
}

// Virtual joystick (DOM overlay, bottom left) - touch devices only.
// Writes a normalized (-1..1) movement vector into the game store.
const JOYSTICK_SIZE = 120;
const JOYSTICK_RADIUS = JOYSTICK_SIZE / 2;
const JOYSTICK_KNOB = 44;
const JOYSTICK_TRAVEL = JOYSTICK_RADIUS - JOYSTICK_KNOB / 2;

function Joystick() {
  const setMoveInput = useGameStore((s) => s.setMoveInput);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const applyPosition = useCallback((clientX: number, clientY: number) => {
    let dx = clientX - center.current.x;
    let dy = clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_TRAVEL) {
      dx = (dx / dist) * JOYSTICK_TRAVEL;
      dy = (dy / dist) * JOYSTICK_TRAVEL;
    }
    setKnob({ x: dx, y: dy });
    setMoveInput({ x: dx / JOYSTICK_TRAVEL, z: dy / JOYSTICK_TRAVEL });
  }, [setMoveInput]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    applyPosition(e.clientX, e.clientY);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    applyPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    setMoveInput({ x: 0, z: 0 });
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute', bottom: '80px', left: '24px',
        width: `${JOYSTICK_SIZE}px`, height: `${JOYSTICK_SIZE}px`,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.35)',
        border: '2px solid rgba(212, 175, 55, 0.6)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 600,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: `${JOYSTICK_KNOB}px`, height: `${JOYSTICK_KNOB}px`,
          marginLeft: `${-JOYSTICK_KNOB / 2 + knob.x}px`,
          marginTop: `${-JOYSTICK_KNOB / 2 + knob.y}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #e8d5b7)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const isTouchDevice = useIsTouchDevice();
  const xrActive = useGameStore((s) => s.xrActive);
  const quality = useGameStore((s) => s.quality);
  const q = QUALITY_SETTINGS[quality];

  // SPEC-perf-stoffe A2: dynamisches dpr. Basis = QUALITY_SETTINGS[quality].dpr
  // (Start am oberen Rand, PerformanceMonitor regelt runter/hoch), gefolgt von
  // der Movement-Regression (A3) via performance.current-Multiplikation.
  const minDpr = q.dpr[0];
  const maxDpr = q.dpr[1];
  const [dpr, setDpr] = useState<number>(q.dpr[1]);

  useEffect(() => {
    const stages = [
      { progress: 20, delay: 0 },
      { progress: 45, delay: 300 },
      { progress: 70, delay: 600 },
      { progress: 90, delay: 900 },
      { progress: 100, delay: 1200 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = stages.map(({ progress, delay }) =>
      setTimeout(() => setLoadProgress(progress), delay)
    );
    timers.push(setTimeout(() => setIsLoading(false), 1500));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a1a' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#e8d5b7', transition: 'opacity 0.8s ease'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', letterSpacing: '0.15em' }}>🕎 STIFTSHÜTTE VR</h1>
          <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '2rem' }}>Wird geladen… {loadProgress}%</p>
          <div style={{ width: '300px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #c9a84c, #e8d5b7)', width: `${loadProgress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* VR Enter Button (only when immersive-vr is supported) */}
      <VRButton />

      {/* Three.js Canvas with XR — Quest-3-Settings (Budget-Regeln 6-7):
          dpr [1,2], high-performance, ACESFilmic exposure 1.1, Foveation 1.
          SPEC F: 'low'-Tier faehrt dpr [0.75,1.25] + antialias aus.
          SPEC-perf-stoffe A2: dynamisches dpr via PerformanceMonitor
          (pmndrs "Scaling Performance"), bounds/flipflops wie SPEC. */}
      <Canvas
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 1.6, -8], rotation: [0, Math.PI, 0] }}
        shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
        dpr={dpr}
        gl={{
          antialias: q.antialias,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
          // Kino-Look: ACES-Filmic-Tonemapping, dezente Exposure
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          // Starkes Foveation für Standstill-Experience (Budget-Regel 6)
          gl.xr.setFoveation(1);
          gl.setClearColor(0xCFC2A6); // = Fog-Farbe (Re-Review: Tonunterschied im Horizont-Lückenband)
        }}
      >
        {/* A2: fps-Überwachung → dpr +0.25/-0.25, Fallback = minDpr nach 3 Flipflops */}
        <PerformanceMonitor
          bounds={(refreshrate) => (refreshrate > 90 ? [45, 85] : [28, 55])}
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(minDpr, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
          onFallback={() => setDpr(minDpr)}
        />

        {/* A3: Bewegung → performance.regress() → dpr temporaer runter */}
        <MovementRegress baseDpr={dpr} />

        {/* A4: Shader-Precompile nach dem ersten Frame */}
        <PrecompileShaders />

        <XR store={store}>
          {/* Official VR locomotion using react-three/xr hook */}
          <LocomotionController />

          {/* Game UI - inside Canvas for useThree hook */}
          <GameStateManager />

          {/* Mirror XR session state into the zustand store for DOM overlays */}
          <XRSessionSync />

          <Scene />

          {/* Bloom + Vignette nur ausserhalb XR */}
          <PostFX />
        </XR>
      </Canvas>

      {/* Virtual joystick - touch devices only */}
      {isTouchDevice && <Joystick />}

      {/* Pause menu - DOM overlay outside the Canvas (works anywhere in the world) */}
      <GameUI />

      {/* Instructions - adaptive per device, hidden while an XR session is active */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        color: '#C9A84C', fontSize: '14px', fontFamily: 'Georgia, serif',
        background: 'rgba(0, 0, 0, 0.45)', borderRadius: '8px', padding: '6px 14px',
        zIndex: 999,
        textAlign: 'center', whiteSpace: 'nowrap'
      }}>
        {xrActive
          ? '🥽 VR: Linker Stick = Laufen, Rechter Stick = Drehen, Trigger = Teleport'
          : isTouchDevice
            ? '🕹️ Joystick links: Laufen | Rechte Hälfte ziehen: Umsehen'
            : '🖥️ WASD: Laufen | Maus ziehen: Drehen'}
      </div>
    </div>
  );
}

// Collision blockers (AABBs): tabernacle walls (only entrance z=31.5 and veil
// z=40.5 passable), bronze altar (2.25 x 2.25 at z=27), bronze basin (z=29.5)
interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const PLAYER_RADIUS = 0.3;
const COLLIDERS: AABB[] = [
  // Tabernacle south wall (x = -2.25)
  { minX: -2.55, maxX: -1.95, minZ: 31.3, maxZ: 45.3 },
  // Tabernacle north wall (x = +2.25)
  { minX: 1.95, maxX: 2.55, minZ: 31.3, maxZ: 45.3 },
  // Tabernacle west back wall (z = 45)
  { minX: -2.55, maxX: 2.55, minZ: 44.7, maxZ: 45.3 },
  // Bronze altar: 5 x 5 cubits (2.25m) at z = 27
  { minX: -1.125, maxX: 1.125, minZ: 25.875, maxZ: 28.125 },
  // Bronze basin: radius ~0.8 at z = 29.5
  { minX: -0.9, maxX: 0.9, minZ: 28.6, maxZ: 30.4 },
];

function isBlocked(x: number, z: number): boolean {
  for (const c of COLLIDERS) {
    if (
      x > c.minX - PLAYER_RADIUS &&
      x < c.maxX + PLAYER_RADIUS &&
      z > c.minZ - PLAYER_RADIUS &&
      z < c.maxZ + PLAYER_RADIUS
    ) {
      return true;
    }
  }
  return false;
}

const PITCH_LIMIT = THREE.MathUtils.degToRad(85);

// Wiederverwendbare Vektoren (KEINE Allokation pro Frame, Budget-Regel)
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Official VR Locomotion using useXRControllerLocomotion hook from react-three/xr v6
// This hook handles all the XR controller input and locomotion logic
function LocomotionController() {
  const ref = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const session = useXR((s) => s.session);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const pitch = useRef(0);
  // Touch-look state: track the dedicated look pointer (right half of screen)
  const lookPointerId = useRef<number | null>(null);
  const lastTouch = useRef({ x: 0, y: 0 });

  // Shared look logic (mouse drag AND touch drag): yaw + pitch, clamped to +/-85°
  const applyLook = useCallback((dx: number, dy: number) => {
    euler.current.setFromQuaternion(camera.quaternion);
    euler.current.y -= dx * 0.005;
    pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current - dy * 0.005));
    euler.current.x = pitch.current;
    camera.quaternion.setFromEuler(euler.current);
  }, [camera]);

  // Browser keyboard/mouse controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') { keys.current.w = true; e.preventDefault(); }
      if (key === 'a' || key === 'arrowleft') { keys.current.a = true; e.preventDefault(); }
      if (key === 's' || key === 'arrowdown') { keys.current.s = true; e.preventDefault(); }
      if (key === 'd' || key === 'arrowright') { keys.current.d = true; e.preventDefault(); }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.current.w = false;
      if (key === 'a' || key === 'arrowleft') keys.current.a = false;
      if (key === 's' || key === 'arrowdown') keys.current.s = false;
      if (key === 'd' || key === 'arrowright') keys.current.d = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDown.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDown.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        applyLook(dx, dy);
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, applyLook]);

  // Touch-look: a touch on the RIGHT half of the canvas starts a look drag
  // (the joystick on the left is a separate DOM element, so its pointer never
  // reaches the canvas - multi-touch look/walk works independently via pointer IDs)
  useEffect(() => {
    const el = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (lookPointerId.current !== null) return;
      if (e.clientX < window.innerWidth / 2) return;
      lookPointerId.current = e.pointerId;
      lastTouch.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || e.pointerId !== lookPointerId.current) return;
      applyLook(e.clientX - lastTouch.current.x, e.clientY - lastTouch.current.y);
      lastTouch.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === lookPointerId.current) lookPointerId.current = null;
    };

    el.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [gl, applyLook]);

  // useXRControllerLocomotion - official react-three/xr v6 hook
  // Uses callback form to get velocity and rotationVelocityY
  useXRControllerLocomotion(
    (velocity, rotationVelocityY, deltaTime, state, frame) => {
      if (useGameStore.getState().isPaused) return;

      // Apply VR controller movement to XROrigin (position only)
      if (ref.current) {
        // Axis-separated movement with AABB collision
        const p = ref.current.position;
        const nx = p.x + velocity.x * deltaTime;
        if (!isBlocked(nx, p.z)) p.x = Math.max(-10.5, Math.min(10.5, nx));
        const nz = p.z + velocity.z * deltaTime;
        if (!isBlocked(p.x, nz)) p.z = Math.max(-5, Math.min(43, nz));
        p.y = 0;
      }

      // Snap turn: rotate the XROrigin group (camera pose is headset-driven in XR)
      if (ref.current && Math.abs(rotationVelocityY) > 0.01) {
        ref.current.rotation.y += rotationVelocityY * deltaTime;
      }
    },
    // Translation options (left stick)
    { speed: 3.0 },
    // Rotation options (right stick) - snap turn with smaller steps
    { type: 'snap', degrees: 30, deadZone: 0.2 }
  );

  // Browser movement: outside XR directly on camera.position, in XR on XROrigin
  useFrame((_, delta) => {
    if (useGameStore.getState().isPaused) return;

    let moveX = 0;
    let moveZ = 0;

    // Browser keyboard controls
    if (keys.current.w) moveZ -= 1;
    if (keys.current.s) moveZ += 1;
    if (keys.current.a) moveX -= 1;
    if (keys.current.d) moveX += 1;

    // Virtual joystick (touch): analog vector, merged with keyboard
    const joy = useGameStore.getState().moveInput;
    moveX += joy.x;
    moveZ += joy.z;

    // Normalize (clamped to max speed 1)
    let magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveZ /= magnitude;
      magnitude = 1;
    }

    if (magnitude > 0.1) {
      // Get camera direction (Modul-Konstanten wiederverwendet — nichts pro Frame)
      camera.getWorldDirection(_dir);
      _dir.y = 0;
      _dir.normalize();

      _right.crossVectors(_dir, _up).normalize();

      // Analog speed: full keyboard input = magnitude 1, partial joystick = slower
      const speed = magnitude * 3.0;
      const deltaX =
        _dir.x * -moveZ * speed * delta + _right.x * moveX * speed * delta;
      const deltaZ =
        _dir.z * -moveZ * speed * delta + _right.z * moveX * speed * delta;

      if (session) {
        // XR: move the XROrigin group
        const target = ref.current;
        if (!target) return;
        const p = target.position;
        const nx = p.x + deltaX;
        if (!isBlocked(nx, p.z)) p.x = Math.max(-10.5, Math.min(10.5, nx));
        const nz = p.z + deltaZ;
        if (!isBlocked(p.x, nz)) p.z = Math.max(-5, Math.min(43, nz));
        p.y = 0;
      } else {
        // Desktop: move the camera directly (XROrigin does not drive it outside XR)
        const p = camera.position;
        const nx = p.x + deltaX;
        if (!isBlocked(nx, p.z)) p.x = Math.max(-10.5, Math.min(10.5, nx));
        const nz = p.z + deltaZ;
        if (!isBlocked(p.x, nz)) p.z = Math.max(-5, Math.min(43, nz));
        p.y = 1.6;
      }
    }
  });

  // VR restart: reset XROrigin AND camera to the start position from the store
  const restartToken = useGameStore((s) => s.restartToken);
  const resetPosition = useGameStore((s) => s.resetPosition);
  useEffect(() => {
    if (restartToken > 0) {
      pitch.current = 0;
      if (ref.current) {
        ref.current.position.set(resetPosition.x, 0, resetPosition.z);
        ref.current.rotation.set(0, 0, 0);
      }
      camera.position.set(resetPosition.x, 1.6, resetPosition.z);
      camera.rotation.set(0, Math.PI, 0);
    }
  }, [restartToken, resetPosition, camera]);

  // Start outside the gate: z = -8 (camera looks west, toward gate and altar)
  return <XROrigin ref={ref} position={[0, 0, -8]} />;
}