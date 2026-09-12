import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ModelProps {
  isMoving: boolean;
  isRidingHorse?: boolean;
}

function ProgrammaticChibi({ isMoving }: ModelProps) {
  const group = useRef<THREE.Group>(null)
  
  // Animate the chibi bobbing when moving
  useFrame((state) => {
    if (group.current) {
      if (isMoving) {
        group.current.position.y = Math.sin(state.clock.elapsedTime * 15) * 0.15;
        group.current.rotation.y = Math.sin(state.clock.elapsedTime * 10) * 0.1;
      } else {
        // Idle animation
        group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
        group.current.rotation.y = 0;
      }
    }
  })

  const skinColor = "#ffcd94";
  const shirtColor = "#3b82f6";
  const pantsColor = "#1e3a8a";
  const shoeColor = "#333333";

  return (
    <group ref={group} position={[0, 0, 0]} scale={0.5}>
      {/* Head */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color={skinColor} roughness={0.4} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.2, 1.3, 0.55]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.2, 1.3, 0.55]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Body / Shirt */}
      <mesh position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.3, 0.4, 16, 16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.4, 0.5, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.3, 16, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      {/* Right Arm */}
      <mesh position={[0.4, 0.5, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.3, 16, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.15, -0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.4]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      {/* Right Leg */}
      <mesh position={[0.15, -0.1, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.4]} />
        <meshStandardMaterial color={pantsColor} />
      </mesh>
      
      {/* Left Shoe */}
      <mesh position={[-0.15, -0.35, 0.05]}>
        <boxGeometry args={[0.25, 0.15, 0.3]} />
        <meshStandardMaterial color={shoeColor} />
      </mesh>
      {/* Right Shoe */}
      <mesh position={[0.15, -0.35, 0.05]}>
        <boxGeometry args={[0.25, 0.15, 0.3]} />
        <meshStandardMaterial color={shoeColor} />
      </mesh>
    </group>
  )
}

function ProgrammaticHorse({ isMoving }: { isMoving: boolean }) {
  const group = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (group.current) {
      if (isMoving) {
        group.current.position.y = Math.sin(state.clock.elapsedTime * 20) * 0.1 - 0.2; // Galloping bounce
        group.current.rotation.x = Math.sin(state.clock.elapsedTime * 20) * 0.05; 
      } else {
        group.current.position.y = -0.2;
        group.current.rotation.x = 0;
      }
    }
  })

  const horseColor = "#8B4513"; // SaddleBrown
  const maneColor = "#3e1c00";

  return (
    <group ref={group} position={[0, -0.2, 0]} scale={0.6}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.9]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.5, -0.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
        <meshStandardMaterial color={maneColor} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.8, 0.4]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.1, 0.5]}>
        <boxGeometry args={[0.25, 0.25, 0.4]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.2, 0.1, 0.3]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      <mesh position={[0.2, 0.1, 0.3]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      <mesh position={[-0.2, 0.1, -0.3]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
      <mesh position={[0.2, 0.1, -0.3]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshStandardMaterial color={horseColor} />
      </mesh>
    </group>
  )
}

export const Character3D: React.FC<ModelProps> = ({ isMoving, isRidingHorse }) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none z-[500]">
      <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
        
        {isRidingHorse && <ProgrammaticHorse isMoving={isMoving} />}
        
        <group position={[0, isRidingHorse ? 0.4 : 0, 0]}>
          <ProgrammaticChibi isMoving={isMoving} />
        </group>
      </Canvas>
    </div>
  )
}
