import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, XROrigin, useXRControllerLocomotion, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { GameStateManager } from './components/GameUI';

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

    stages.forEach(({ progress, delay }) => {
      setTimeout(() => setLoadProgress(progress), delay);
    });

    const timeout = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timeout);
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
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', letterSpacing: '0.15em' }}>⛪ STIFTSHÜTTE VR</h1>
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
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 1.6, -3], rotation: [0, 0, 0] }}
        shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
          gl.setClearColor(0x1a1a2e);
          console.log('[Tabernacle VR] Canvas ready');
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

// Official VR Locomotion using useXRControllerLocomotion hook from react-three/xr v6
// This hook handles all the XR controller input and locomotion logic
function LocomotionController() {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const isMouseDown = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const browserMove = useRef({ x: 0, z: 0 });

  // Browser keyboard/mouse controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.current.w = true;
      if (key === 'a' || key === 'arrowleft') keys.current.a = true;
      if (key === 's' || key === 'arrowdown') keys.current.s = true;
      if (key === 'd' || key === 'arrowright') keys.current.d = true;
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
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y -= dx * 0.005;
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
      // Apply VR controller movement to XROrigin (position only)
      if (ref.current) {
        ref.current.position.x += velocity.x * deltaTime;
        ref.current.position.z += velocity.z * deltaTime;
        
        // Clamp to tabernacle bounds
        ref.current.position.x = Math.max(-10, Math.min(10, ref.current.position.x));
        ref.current.position.z = Math.max(-5, Math.min(35, ref.current.position.z));
      }
      
      // Rotation: Apply to camera directly (like browser mouse look)
      if (Math.abs(rotationVelocityY) > 0.01) {
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y += rotationVelocityY * deltaTime;
        camera.quaternion.setFromEuler(euler.current);
      }
    },
    // Translation options (left stick)
    { speed: 3.0 },
    // Rotation options (right stick) - snap turn with smaller steps
    { type: 'snap', degrees: 30, deadZone: 0.2 }
  );

  // Apply browser movement to XROrigin
  useFrame((_, delta) => {
    if (!ref.current) return;
    
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
      
      // Apply to XROrigin (ref) for VR consistency
      ref.current.position.addScaledVector(cameraDirection, -moveZ * 3.0 * delta);
      ref.current.position.addScaledVector(right, moveX * 3.0 * delta);
      
      // Keep at floor level
      ref.current.position.y = 0;
      
      // Clamp bounds
      ref.current.position.x = Math.max(-10, Math.min(10, ref.current.position.x));
      ref.current.position.z = Math.max(-5, Math.min(35, ref.current.position.z));
    }
  });

  return <XROrigin ref={ref} />;
}