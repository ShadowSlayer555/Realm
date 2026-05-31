import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils } from 'three';

interface PlayerModelProps {
  position: [number, number, number];
  rotation: [number, number, number];
  isAttacking: boolean;
  isMoving: boolean;
  colorPrimary?: string;
  colorSecondary?: string;
  isZombie?: boolean;
}

export function BlockyCharacter({ position, rotation, isAttacking, isMoving, colorPrimary = '#00aaaa', colorSecondary = '#1111bb', isZombie = false }: PlayerModelProps) {
  const group = useRef<Group>(null);
  const leftArmGroup = useRef<Group>(null);
  const rightArmGroup = useRef<Group>(null);
  const leftLegGroup = useRef<Group>(null);
  const rightLegGroup = useRef<Group>(null);
  const weaponGroup = useRef<Group>(null);

  const walkingPhase = useRef(0);
  const attackPhase = useRef(0);

  useFrame((state, delta) => {
    // Walking animation
    if (isMoving) {
      walkingPhase.current += delta * 15;
    } else {
      // Return to standing
      walkingPhase.current = MathUtils.lerp(walkingPhase.current, 0, delta * 10);
      if (Math.abs(walkingPhase.current) < 0.1) walkingPhase.current = 0;
    }

    const swingAngle = Math.sin(walkingPhase.current) * 0.5;
    
    if (leftArmGroup.current) leftArmGroup.current.rotation.x = -swingAngle;
    if (rightArmGroup.current) rightArmGroup.current.rotation.x = swingAngle;
    if (leftLegGroup.current) leftLegGroup.current.rotation.x = swingAngle;
    if (rightLegGroup.current) rightLegGroup.current.rotation.x = -swingAngle;

    // Attacking animation overriding right arm
    if (isAttacking) {
      attackPhase.current = MathUtils.lerp(attackPhase.current, 1.5, delta * 20);
      if (rightArmGroup.current) {
        rightArmGroup.current.rotation.x = -attackPhase.current;
        // Turn sword outwards a bit
        if (weaponGroup.current) {
           weaponGroup.current.rotation.z = -Math.PI / 4;
        }
      }
    } else {
      attackPhase.current = MathUtils.lerp(attackPhase.current, 0, delta * 10);
      if (rightArmGroup.current && attackPhase.current > 0.1) {
        rightArmGroup.current.rotation.x = -attackPhase.current; // override walking returning
      }
      if (weaponGroup.current) {
         weaponGroup.current.rotation.z = MathUtils.lerp(weaponGroup.current.rotation.z, 0, delta * 10);
      }
    }
  });

  const skinColor = isZombie ? '#44aa44' : '#eebb99';
  const shirtColor = isZombie ? '#00aaaa' : colorPrimary;
  const pantsColor = isZombie ? '#4444aa' : colorSecondary;

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.75, 0.25]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.375, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Left Arm Pivot */}
      <group ref={leftArmGroup} position={[0.375, 1.125, 0]}>
        <mesh position={[0, -0.375, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.75, 0.25]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Right Arm Pivot */}
      <group ref={rightArmGroup} position={[-0.375, 1.125, 0]}>
         <mesh position={[0, -0.375, 0]} castShadow receiveShadow>
           <boxGeometry args={[0.25, 0.75, 0.25]} />
           <meshStandardMaterial color={skinColor} />
         </mesh>
         
         {/* Weapon */}
         {!isZombie && (
           <group ref={weaponGroup} position={[0, -0.75, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
             {/* Blade */}
             <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
               <boxGeometry args={[0.05, 0.8, 0.1]} />
               <meshStandardMaterial color="#aaaaaa" />
             </mesh>
             {/* Handle */}
             <mesh position={[0, 0, 0]} castShadow receiveShadow>
               <boxGeometry args={[0.05, 0.2, 0.05]} />
               <meshStandardMaterial color="#8b4513" />
             </mesh>
             {/* Guard */}
             <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
               <boxGeometry args={[0.2, 0.05, 0.1]} />
               <meshStandardMaterial color="#333333" />
             </mesh>
           </group>
         )}
      </group>

      {/* Left Leg Pivot */}
      <group ref={leftLegGroup} position={[0.125, 0.375, 0]}>
        <mesh position={[0, -0.1875, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.375, 0.25]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
      </group>

      {/* Right Leg Pivot */}
      <group ref={rightLegGroup} position={[-0.125, 0.375, 0]}>
        <mesh position={[0, -0.1875, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.375, 0.25]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
      </group>
    </group>
  );
}
