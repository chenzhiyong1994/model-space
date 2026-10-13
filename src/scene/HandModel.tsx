import { useGLTF } from '@react-three/drei'
import { ANATOMICAL_HAND_URL, createDisplayHandGeometry } from './handGeometry'

/** Shared immutable geometry: loading, posing and wrist blending happen once. */
export function HandModel({ color = '#e9d8c6' }: { color?: string }) {
  const { scene } = useGLTF(ANATOMICAL_HAND_URL, false)
  const geometry = createDisplayHandGeometry(scene)
  return <mesh geometry={geometry} dispose={null} castShadow receiveShadow>
    <meshPhysicalMaterial color={color} roughness={0.48} clearcoat={0.12} clearcoatRoughness={0.55} />
  </mesh>
}
