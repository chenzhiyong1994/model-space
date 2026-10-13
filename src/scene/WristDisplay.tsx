import { Suspense } from 'react'
import { BeadStrand } from './Jewelry'
import { HandModel } from './HandModel'
import { HAND_BRACELET_FIT } from './handGeometry'

export function WristDisplay({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.014, 0]} castShadow receiveShadow><cylinderGeometry args={[0.09, 0.096, 0.028, 64]} /><meshStandardMaterial color="#665143" roughness={0.6} /></mesh>
    <mesh position={[0, 0.029, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.003, 64]} /><meshStandardMaterial color="#c4a263" metalness={0.7} roughness={0.28} /></mesh>
    <group position={[0, 0.031, 0]}>
      <Suspense fallback={null}><HandModel color="#ddd2c2" /></Suspense>
      <group position={HAND_BRACELET_FIT.center}>
        <BeadStrand color={color} style="jade" radiusX={HAND_BRACELET_FIT.radiusX} radiusZ={HAND_BRACELET_FIT.radiusZ} beadRadius={HAND_BRACELET_FIT.beadRadius} count={HAND_BRACELET_FIT.beadCount} charm={false} />
      </group>
    </group>
  </group>
}
