import { useRef } from 'react';
import * as THREE from 'three';
import { TabernacleFloor } from './TabernacleFloor';
import { TabernacleCourtyard } from './TabernacleCourtyard';
import { HolyPlace } from './HolyPlace';
import { HolyOfHolies } from './HolyOfHolies';

export function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={groupRef}>
      {/* === SIMPLE SKY === */}
      <mesh position={[0, 50, 15]}>
        <sphereGeometry args={[180, 32, 32]} />
        <meshBasicMaterial color={0x87CEEB} side={THREE.BackSide} />
      </mesh>
      
      {/* === SIMPLE LIGHTING === */}
      <ambientLight intensity={0.7} color={0xffffff} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color={0xffffff} castShadow />
      <pointLight position={[0, 4, 7]} intensity={3} color={0xFF6600} distance={20} />
      <pointLight position={[-4, 4, -5.25]} intensity={2} color={0xFFD700} distance={12} />
      <pointLight position={[0, 4, -11.25]} intensity={2} color={0xFFE4B5} distance={10} />
      
      {/* === COURTYARD === */}
      <TabernacleFloor />
      <TabernacleCourtyard />
      
      {/* === HOLY PLACE === */}
      <HolyPlace />
      
      {/* === HOLY OF HOLIES === */}
      <HolyOfHolies />
    </group>
  );
}