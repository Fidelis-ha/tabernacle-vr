import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, XROrigin, useXR, useXRControllerLocomotion, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { GameStateManager, GameUI, useGameStore } from './components/GameUI';

// Create XR store with teleport enabled
const store = createXRStore({
  controller: { teleportPointer: true },
  hand: { teleportPointer: true }
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

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

      {/* VR Enter Button */}
      <div style={{
        position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 100
      }}>
        <button
          onClick={() => store.enterVR()}
          style={{
            padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 'bold',
            background: 'linear-gradient(135deg, #c9a84c 0%, #e8d5b7 100%)',
            color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(201, 168, 76, 0.4)'
          }}
        >
          VR Betreten
        </button>
      </div>

      {/* Three.js Canvas with XR */}
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 1.6, -8], rotation: [0, Math.PI, 0] }}
        shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
          gl.setClearColor(0x9DB4C4);
        }}
      >
        <XR store={store}>
          {/* Official VR locomotion using react-three/xr hook */}
          <LocomotionController />
          
          {/* Game UI - inside Canvas for useThree hook */}
          <GameStateManager />
          
          <Scene />
        </XR>
      </Canvas>

      {/* Pause menu - DOM overlay outside the Canvas (works anywhere in the world) */}
      <GameUI />

      {/* Instructions */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        color: '#888', fontSize: '14px', fontFamily: 'monospace', zIndex: 999,
        textAlign: 'center'
      }}>
        🖥️ WASD: Laufen | Maus: Drehen | VR: Linker Stick = Laufen, Rechter Stick = Drehen, Trigger = Teleport
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

// Official VR Locomotion using useXRControllerLocomotion hook from react-three/xr v6
// This hook handles all the XR controller input and locomotion logic
function LocomotionController() {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const session = useXR((s) => s.session);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const pitch = useRef(0);

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
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y -= dx * 0.005;
        // Pitch look: vertical mouse, clamped to +/-85 degrees
        pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current - dy * 0.005));
        euler.current.x = pitch.current;
        camera.quaternion.setFromEuler(euler.current);
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
  }, [camera]);

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

    if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
      // Normalize
      const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (magnitude > 1) {
        moveX /= magnitude;
        moveZ /= magnitude;
      }

      // Get camera direction
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

      const deltaX =
        cameraDirection.x * -moveZ * 3.0 * delta + right.x * moveX * 3.0 * delta;
      const deltaZ =
        cameraDirection.z * -moveZ * 3.0 * delta + right.z * moveX * 3.0 * delta;

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