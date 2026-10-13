import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ellipseBeads, type GemStyle } from './jewelryLayout'

const sphere = new THREE.SphereGeometry(1, 28, 20)
const goldMaterial = new THREE.MeshStandardMaterial({ color: '#c9a365', metalness: 0.78, roughness: 0.27 })
const sphereMatrix = new THREE.Object3D()
const settings = {
  wood: { roughness: 0.34, clearcoat: 0.25, metalness: 0, variation: 0.18 },
  jade: { roughness: 0.18, clearcoat: 0.7, metalness: 0.02, variation: 0.24 },
  amber: { roughness: 0.16, clearcoat: 0.9, metalness: 0.05, variation: 0.24 },
  crystal: { roughness: 0.12, clearcoat: 1, metalness: 0.1, variation: 0.18 },
  pearl: { roughness: 0.23, clearcoat: 0.9, metalness: 0.16, variation: 0.04 },
  obsidian: { roughness: 0.13, clearcoat: 1, metalness: 0.25, variation: 0.08 },
}

function gemMaterial(style: GemStyle, color: string) {
  const config = settings[style]
  const result = new THREE.MeshPhysicalMaterial({ color, roughness: config.roughness, metalness: config.metalness, clearcoat: config.clearcoat, clearcoatRoughness: 0.16 })
  if (style === 'pearl') { result.iridescence = 0.28; result.iridescenceIOR = 1.32 }
  // Local mineral/wood structure: deterministic, offline, no texture fetch per bracelet.
  result.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vMineralPosition;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMineralPosition = position;')
    shader.fragmentShader = 'varying vec3 vMineralPosition;\n' + shader.fragmentShader
    const grain = style === 'wood'
      ? 'sin(p.y * 42.0 + sin(p.x * 9.0) * 2.0 + sin(p.z * 13.0))'
      : 'sin(p.x * 7.0 + sin(p.y * 8.0 + p.z * 3.0) * 2.4) * sin(p.z * 9.0 - p.y * 4.0)'
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\nvec3 p = vMineralPosition;\nfloat mineral = ${grain};\ndiffuseColor.rgb *= 1.0 + mineral * ${config.variation.toFixed(3)};`)
  }
  result.customProgramCacheKey = () => `mineral-${style}-v1`
  return result
}

export function BeadStrand({ color, style = 'jade', radiusX = 0.068, radiusZ = 0.064, beadRadius = 0.0104, count = 18, charm = true }: {
  color: string; style?: GemStyle; radiusX?: number; radiusZ?: number; beadRadius?: number; count?: number; charm?: boolean
}) {
  const gems = useRef<THREE.InstancedMesh>(null)
  const spacers = useRef<THREE.InstancedMesh>(null)
  const points = useMemo(() => ellipseBeads(radiusX, radiusZ, count), [radiusX, radiusZ, count])
  const material = useMemo(() => gemMaterial(style, color), [style, color])
  const cord = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)), true), 100, 0.0007, 5, true), [points])
  useEffect(() => () => { material.dispose(); cord.dispose() }, [material, cord])
  useLayoutEffect(() => {
    if (!gems.current || !spacers.current) return
    points.forEach((point, index) => {
      const pearlScale = style === 'pearl' ? 1 + 0.025 * Math.sin(index * 2.4) : 1
      sphereMatrix.position.set(point.x, 0, point.z)
      sphereMatrix.scale.set(beadRadius, beadRadius * pearlScale, beadRadius)
      sphereMatrix.updateMatrix()
      gems.current!.setMatrixAt(index, sphereMatrix.matrix)
      gems.current!.setColorAt(index, new THREE.Color('#ffffff').multiplyScalar(0.91 + (index % 5) * 0.022))
      const next = points[(index + 1) % count]
      const gap = Math.hypot(next.x - point.x, next.z - point.z) - 2 * beadRadius
      const r = Math.max(0.0006, Math.min(gap * 0.46, 0.0018))
      sphereMatrix.position.set((point.x + next.x) / 2, 0, (point.z + next.z) / 2)
      sphereMatrix.scale.setScalar(r)
      sphereMatrix.updateMatrix()
      spacers.current!.setMatrixAt(index, sphereMatrix.matrix)
    })
    gems.current.instanceMatrix.needsUpdate = true
    if (gems.current.instanceColor) gems.current.instanceColor.needsUpdate = true
    spacers.current.instanceMatrix.needsUpdate = true
    gems.current.computeBoundingSphere(); spacers.current.computeBoundingSphere()
  }, [points, beadRadius, style])
  return <group>
    <instancedMesh ref={gems} args={[sphere, material, count]} castShadow receiveShadow dispose={null} />
    <instancedMesh ref={spacers} args={[sphere, goldMaterial, count]} castShadow dispose={null} />
    <mesh geometry={cord} material={goldMaterial} />
    {charm && <group position={[radiusX + beadRadius + 0.006, -0.004, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={goldMaterial}><torusGeometry args={[0.004, 0.0009, 6, 16]} /></mesh>
      <mesh position={[0, -0.001, 0.01]} scale={[0.007, 0.002, 0.009]} geometry={sphere} material={goldMaterial} castShadow />
      <mesh position={[0, 0.001, 0.01]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.004, 18]} /><meshStandardMaterial color={color} roughness={0.24} /></mesh>
    </group>}
  </group>
}

export function Bracelet({ color, style = 'wood' }: { color: string; style?: GemStyle }) {
  return <group>
    <RoundedBox args={[0.216, 0.023, 0.19]} position={[0, 0.0115, 0]} radius={0.008} smoothness={2} castShadow receiveShadow><meshStandardMaterial color="#705242" roughness={0.63} /></RoundedBox>
    <RoundedBox args={[0.197, 0.008, 0.171]} position={[0, 0.026, 0]} radius={0.006} smoothness={2} receiveShadow><meshStandardMaterial color="#e4d9c6" roughness={0.98} /></RoundedBox>
    <mesh position={[0, 0.063, -0.022]} castShadow><boxGeometry args={[0.009, 0.066, 0.01]} /><meshStandardMaterial color="#ba9b68" metalness={0.65} roughness={0.3} /></mesh>
    <group position={[0, 0.104, -0.006]} rotation={[Math.PI / 2 - 0.34, 0, 0]}>
      <mesh scale={[0.057, 0.021, 0.052]} geometry={sphere} castShadow><meshStandardMaterial color="#dfd1b8" roughness={0.93} /></mesh>
      <BeadStrand color={color} style={style} />
    </group>
    <mesh position={[0.064, 0.033, 0.065]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.044, 0.019]} /><meshStandardMaterial color="#fff8e9" roughness={0.8} /></mesh>
    <mesh position={[0.064, 0.0335, 0.065]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.027, 0.002]} /><meshStandardMaterial color="#8f7959" /></mesh>
  </group>
}

const collections: { color: string; style: GemStyle }[] = [
  { color: '#518e76', style: 'jade' }, { color: '#c47c25', style: 'amber' }, { color: '#8e77b1', style: 'crystal' },
  { color: '#eee0c4', style: 'pearl' }, { color: '#352e37', style: 'obsidian' }, { color: '#935331', style: 'wood' },
]

export function BraceletSteps({ color }: { color: string }) {
  return <group>
    {[0, 1, 2].map(row => <group key={row}>
      <RoundedBox position={[0, (row + 1) * 0.046, 0.18 - row * 0.18]} args={[0.72, (row + 1) * 0.092, 0.18]} radius={0.007} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.8} /></RoundedBox>
      {[-0.22, 0, 0.22].map((x, col) => <group key={col} position={[x, (row + 1) * 0.092, 0.18 - row * 0.18]} scale={0.86}>
        <Bracelet {...collections[(row * 3 + col) % collections.length]} />
      </group>)}
    </group>)}
  </group>
}

export function BraceletStand({ color }: { color: string }) {
  return <group>
    <RoundedBox args={[0.69, 0.026, 0.22]} position={[0, 0.013, 0]} radius={0.009} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.6} /></RoundedBox>
    {[-0.28, 0.28].map(x => <mesh key={x} position={[x, 0.115, 0]} material={goldMaterial} castShadow><cylinderGeometry args={[0.005, 0.008, 0.2, 12]} /></mesh>)}
    <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.034, 0.034, 0.64, 32]} /><meshStandardMaterial color="#c9bda7" roughness={0.98} /></mesh>
    {collections.map((item, index) => <group key={index} position={[-0.25 + index * 0.1, 0.2126, 0]} rotation={[0, 0, Math.PI / 2]}>
      <BeadStrand {...item} radiusX={0.05} radiusZ={0.044} beadRadius={0.0078} count={16} charm={false} />
    </group>)}
  </group>
}
