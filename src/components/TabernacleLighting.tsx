import * as THREE from 'three';
import { Environment, ContactShadows, BakeShadows } from '@react-three/drei';
import { CUBIT, COURTYARD_WIDTH, COURTYARD_LENGTH } from './TabernacleFloor';

export function TabernacleLighting() {
  return (
    <group>
      {/* HDR Environment for realistic reflections and lighting */}
      <Environment preset="sunset" background={false} environmentIntensity={0.8} />
      
      {/* Ambient light - base illumination */}
      <ambientLight intensity={0.6} color={0xFFFFFF} />
      
      {/* Main sun light - bright warm sunlight */}
      <directionalLight
        position={[20, 40, 10]}
        intensity={2}
        color={0xFFE4B5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      
      {/* Fill light */}
      <directionalLight
        position={[-10, 20, 30]}
        intensity={0.8}
        color={0xFFFAF0}
      />
      
      {/* Courtyard fire - altar light */}
      <pointLight
        position={[0, 3.5, 7]}
        intensity={4}
        color={0xFF6600}
        distance={25}
        decay={2}
        castShadow
      />
      
      {/* Holy Place - Menorah glow */}
      <pointLight
        position={[-4, 3.5, -5.25]}
        intensity={3}
        color={0xFFD700}
        distance={15}
        decay={2}
        castShadow
      />
      
      {/* Holy of Holies - Shekinah */}
      <pointLight
        position={[0, 3.5, -11.25]}
        intensity={4}
        color={0xFFE4B5}
        distance={10}
        decay={2}
      />
    </group>
  );
}

export function TabernacleShadows() {
  return (
    <group>
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={60}
        blur={2}
        far={40}
        resolution={256}
        color="#1a1a2e"
      />
      <BakeShadows />
    </group>
  );
}