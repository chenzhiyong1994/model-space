import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { SceneObject } from '../types'
import { Bracelet, BraceletSteps, BraceletStand } from './Jewelry'
import { JEWELRY_STYLES } from './jewelryLayout'
import { JewelryCounter, CollectorCabinet, DisplayTable } from './DisplayFurniture'
import { WristDisplay } from './WristDisplay'
import { DECOR_MODELS } from '../decorCatalog'
import { DecorFurniture } from './DecorFurniture'
import { WayfindingSign } from './WayfindingSign'
import { publicAsset } from '../publicAsset'

const METAL = '#3d4741'
const WOOD = '#bd9165'

function Block({ position, size, color, radius = 0.025 }: { position: [number, number, number]; size: [number, number, number]; color: string; radius?: number }) {
  return <RoundedBox args={size} position={position} radius={radius} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.72} /></RoundedBox>
}

export function Plant({ color = '#4f7050' }: { color?: string }) {
  const leaves = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const angle = index * 2.39996
    const height = 0.93 + (index % 4) * 0.25
    return { angle, height, radius: 0.26 + (index % 3) * 0.12 }
  }), [])
  return <group>
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow><cylinderGeometry args={[0.29, 0.22, 0.5, 32]} /><meshStandardMaterial color="#b28a6f" roughness={0.95} /></mesh>
    <mesh position={[0, 0.505, 0]}><cylinderGeometry args={[0.264, 0.264, 0.012, 32]} /><meshStandardMaterial color="#4b3d30" /></mesh>
    {leaves.map(({ angle, height, radius }, index) => <group key={index} rotation={[0, angle, 0]}>
      <mesh position={[radius / 2, (height + 0.48) / 2, 0]} rotation={[0, 0, -Math.atan2(radius, height - 0.48)]} castShadow><cylinderGeometry args={[0.009, 0.015, Math.hypot(radius, height - 0.48), 6]} /><meshStandardMaterial color="#465b39" roughness={1} /></mesh>
      <mesh position={[radius, height, 0]} rotation={[0.2, 0, -0.48 + (index % 3) * 0.18]} scale={[0.16, 0.34, 0.055]} castShadow><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
    </group>)}
  </group>
}

function Plinth({ color }: { color: string }) {
  return <group>
    <Block position={[0, 0.035, 0]} size={[1.1, 0.07, 1.1]} color="#3e4942" radius={0.008} />
    <Block position={[0, 0.53, 0]} size={[1.18, 0.94, 1.18]} color={color} />
    <mesh position={[0, 0.73, 0.598]}><planeGeometry args={[0.23, 0.075]} /><meshStandardMaterial color="#f1eee5" /></mesh>
    <mesh position={[-0.043, 0.744, 0.6]}><planeGeometry args={[0.09, 0.006]} /><meshBasicMaterial color="#667065" /></mesh>
    <mesh position={[-0.016, 0.725, 0.6]}><planeGeometry args={[0.143, 0.004]} /><meshBasicMaterial color="#b3b6a9" /></mesh>
  </group>
}

function GlassCase({ color }: { color: string }) {
  return <group>
    <Block position={[0, 0.03, 0]} size={[1.35, 0.06, 1.05]} color={METAL} radius={0.01} />
    <Block position={[0, 0.355, 0]} size={[1.42, 0.65, 1.12]} color={color} />
    <Block position={[0, 0.695, 0]} size={[1.46, 0.03, 1.16]} color="#d7cfc0" radius={0.007} />
    <mesh position={[0, 1.29, 0]} renderOrder={2}><boxGeometry args={[1.4, 1.18, 1.1]} /><meshPhysicalMaterial color="#d9e7e2" transparent opacity={0.13} roughness={0.08} metalness={0.15} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {[-0.697, 0.697].flatMap(x => [-0.547, 0.547].map(z => <mesh key={`${x}:${z}`} position={[x, 1.3, z]}><boxGeometry args={[0.013, 1.2, 0.013]} /><meshStandardMaterial color="#afb9af" metalness={0.6} roughness={0.25} /></mesh>))}
    <mesh position={[0, 1.895, 0]}><boxGeometry args={[1.42, 0.012, 1.12]} /><meshPhysicalMaterial color="#e4f0e8" transparent opacity={0.25} roughness={0.05} depthWrite={false} /></mesh>
  </group>
}

function Shelf({ color }: { color: string }) {
  return <group>
    {[-0.87, 0.87].flatMap(x => [-0.29, 0.29].map(z => <Block key={`${x}:${z}`} position={[x, 1.07, z]} size={[0.045, 2.14, 0.045]} color={METAL} radius={0.009} />))}
    {[0.12, 0.65, 1.2, 1.75].map(y => <Block key={y} position={[0, y, 0]} size={[1.88, 0.07, 0.68]} color={color} radius={0.01} />)}
    <Block position={[0, 2.12, 0.29]} size={[1.76, 0.038, 0.038]} color={METAL} radius={0.005} />
    <Block position={[0, 1.1, -0.315]} size={[1.75, 2.05, 0.025]} color="#d9d5c8" radius={0.005} />
  </group>
}

function Bench({ color }: { color: string }) {
  return <group>
    <Block position={[0, 0.46, 0]} size={[2.2, 0.15, 0.67]} color={color} radius={0.045} />
    {[-0.78, 0.78].map(x => <group key={x}><Block position={[x, 0.215, 0]} size={[0.1, 0.43, 0.56]} color={METAL} radius={0.009} /></group>)}
    <Block position={[0, 0.515, 0]} size={[1.9, 0.06, 0.53]} color="#c8bc9f" radius={0.025} />
  </group>
}

function Lamp({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.035, 0]} castShadow><cylinderGeometry args={[0.31, 0.33, 0.07, 40]} /><meshStandardMaterial color={METAL} roughness={0.6} /></mesh>
    <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.018, 0.018, 1.75, 10]} /><meshStandardMaterial color={METAL} metalness={0.5} roughness={0.35} /></mesh>
    <mesh position={[0, 1.7, 0]} castShadow><coneGeometry args={[0.4, 0.31, 40, 1, true]} /><meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 1.57, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.36, 40]} /><meshStandardMaterial color="#fff4d8" emissive="#ffe3a5" emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>
  </group>
}

function Vase({ color }: { color: string }) {
  const points = useMemo(() => [[0, 0], [0.22, 0], [0.26, 0.025], [0.3, 0.15], [0.37, 0.4], [0.36, 0.62], [0.29, 0.79], [0.15, 0.92], [0.135, 1.15], [0.145, 1.2], [0.115, 1.2], [0.105, 1.14], [0.115, 0.93], [0.26, 0.76], [0.33, 0.61], [0.34, 0.4], [0.27, 0.15], [0.2, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), [])
  return <mesh castShadow receiveShadow><latheGeometry args={[points, 64]} /><meshStandardMaterial color={color} roughness={0.37} metalness={0.06} /></mesh>
}

function Arch({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.66, 0)
    shape.lineTo(-0.66, 0.96)
    shape.absarc(0, 0.96, 0.66, Math.PI, 0, true)
    shape.lineTo(0.66, 0)
    shape.lineTo(0.36, 0)
    shape.lineTo(0.36, 0.96)
    shape.absarc(0, 0.96, 0.36, 0, Math.PI, false)
    shape.lineTo(-0.36, 0)
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.026, bevelThickness: 0.026, curveSegments: 32 })
    result.translate(0, 0.026, -0.16)
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} scale={[2, 2, 1.6]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.64} /></mesh>
}

function Sculpture({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const result = new THREE.TorusKnotGeometry(0.42, 0.145, 144, 20, 2, 3)
    result.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.12, 0.35, -0.25)))
    result.computeBoundingBox()
    result.translate(0, 0.114 - result.boundingBox!.min.y, 0)
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group>
    <mesh position={[0, 0.057, 0]} castShadow receiveShadow><cylinderGeometry args={[0.35, 0.38, 0.114, 48]} /><meshStandardMaterial color="#393e38" roughness={0.55} /></mesh>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.28} metalness={0.18} /></mesh>
  </group>
}

function Pedestal({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow><cylinderGeometry args={[0.44, 0.46, 0.06, 48]} /><meshStandardMaterial color="#3e4942" roughness={0.55} /></mesh>
    <mesh position={[0, 0.53, 0]} castShadow receiveShadow><cylinderGeometry args={[0.37, 0.41, 0.94, 48]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
    <mesh position={[0, 1.025, 0]} castShadow receiveShadow><cylinderGeometry args={[0.43, 0.43, 0.05, 48]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
  </group>
}

function Easel({ color }: { color: string }) {
  return <group>
    {[-0.29, 0.29].map(x => <mesh key={x} position={[x, 0.86, 0]} rotation={[-0.11, 0, 0]} castShadow><boxGeometry args={[0.05, 1.75, 0.05]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>)}
    <mesh position={[0, 0.82, 0.42]} rotation={[0.5, 0, 0]} castShadow><boxGeometry args={[0.05, 1.72, 0.05]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
    <mesh position={[0, 0.75, 0.19]} castShadow><boxGeometry args={[0.68, 0.045, 0.1]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
    <group position={[0, 1.17, 0.135]} rotation={[-0.11, 0, 0]}>
      <mesh castShadow><boxGeometry args={[0.6, 0.8, 0.024]} /><meshStandardMaterial color="#f4efe2" roughness={0.85} /></mesh>
      <mesh position={[-0.13, 0.13, 0.016]}><boxGeometry args={[0.2, 0.26, 0.004]} /><meshStandardMaterial color="#cd6845" roughness={0.8} /></mesh>
      <mesh position={[0.14, 0.05, 0.016]}><circleGeometry args={[0.1, 32]} /><meshStandardMaterial color="#57776b" roughness={0.8} /></mesh>
      <mesh position={[0.04, -0.2, 0.016]}><boxGeometry args={[0.34, 0.05, 0.004]} /><meshStandardMaterial color="#39443c" roughness={0.8} /></mesh>
    </group>
    <mesh position={[0, 1.61, 0.1]} rotation={[-0.11, 0, 0]} castShadow><boxGeometry args={[0.12, 0.1, 0.05]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
  </group>
}

function Partition({ color }: { color: string }) {
  return <group>
    {[-0.62, 0.62].map(x => <mesh key={x} position={[x, 0.035, 0]} castShadow receiveShadow><boxGeometry args={[0.5, 0.07, 0.4]} /><meshStandardMaterial color="#3e4942" roughness={0.55} /></mesh>)}
    <mesh position={[0, 1.14, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 2.14, 0.09]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>
    <mesh position={[0, 2.225, 0]} castShadow><boxGeometry args={[1.84, 0.05, 0.12]} /><meshStandardMaterial color="#bd9165" roughness={0.7} /></mesh>
    <mesh position={[0, 1.45, 0.052]}><boxGeometry args={[0.52, 0.66, 0.02]} /><meshStandardMaterial color="#8a7a5f" roughness={0.6} /></mesh>
    <mesh position={[0, 1.45, 0.065]}><planeGeometry args={[0.42, 0.56]} /><meshStandardMaterial color="#f2ead9" roughness={0.9} /></mesh>
    <mesh position={[0, 1.52, 0.067]}><circleGeometry args={[0.09, 24]} /><meshStandardMaterial color="#cd6845" roughness={0.85} /></mesh>
    <mesh position={[0, 1.3, 0.067]}><planeGeometry args={[0.3, 0.035]} /><meshStandardMaterial color="#57776b" roughness={0.85} /></mesh>
  </group>
}

function Stones({ color }: { color: string }) {
  const shades = useMemo(() => {
    const base = new THREE.Color(color)
    return [base.clone().offsetHSL(0, 0, -0.06), base.clone(), base.clone().offsetHSL(0, 0, 0.05)]
  }, [color])
  const stones = [
    { r: 0.32, sy: 0.5, y: 0.16, x: 0, z: 0 },
    { r: 0.25, sy: 0.55, y: 0.445, x: 0.05, z: -0.02 },
    { r: 0.185, sy: 0.58, y: 0.678, x: -0.04, z: 0.03 },
    { r: 0.105, sy: 0.65, y: 0.843, x: 0.02, z: -0.01 },
  ]
  return <group>
    {stones.map((stone, index) => <mesh key={index} position={[stone.x, stone.y, stone.z]} scale={[1, stone.sy, 1]} castShadow receiveShadow>
      <sphereGeometry args={[stone.r, 28, 20]} />
      <meshStandardMaterial color={shades[index % shades.length]} roughness={0.92} />
    </mesh>)}
  </group>
}

function Mobile({ color }: { color: string }) {
  const arm = useRef<THREE.Group>(null)
  const sway = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (arm.current) arm.current.rotation.y = t * 0.25
    sway.current.forEach((group, index) => { if (group) group.rotation.x = Math.sin(t * 1.1 + index * 1.7) * 0.14 })
  })
  const leaves = [
    { x: -0.31, y: -0.34, s: 0.16 },
    { x: 0.3, y: -0.52, s: 0.2 },
    { x: -0.08, y: -0.7, s: 0.13 },
  ]
  return <group>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow><cylinderGeometry args={[0.3, 0.33, 0.06, 40]} /><meshStandardMaterial color="#3e4942" roughness={0.55} /></mesh>
    <mesh position={[0, 0.84, 0]} castShadow><cylinderGeometry args={[0.016, 0.02, 1.62, 12]} /><meshStandardMaterial color="#3e4942" metalness={0.5} roughness={0.35} /></mesh>
    <group ref={arm} position={[0, 1.65, 0]}>
      <mesh castShadow><boxGeometry args={[0.72, 0.022, 0.022]} /><meshStandardMaterial color="#3e4942" metalness={0.5} roughness={0.35} /></mesh>
      {leaves.map((leaf, index) => <group key={index} ref={element => { sway.current[index] = element }} position={[leaf.x, 0, 0]}>
        <mesh position={[0, leaf.y / 2, 0]}><cylinderGeometry args={[0.004, 0.004, -leaf.y, 6]} /><meshStandardMaterial color="#8b9288" roughness={0.5} /></mesh>
        <mesh position={[0, leaf.y - leaf.s * 0.6, 0]} scale={[1, 1.45, 0.32]} castShadow><sphereGeometry args={[leaf.s, 20, 14]} /><meshStandardMaterial color={color} roughness={0.5} metalness={0.15} /></mesh>
      </group>)}
    </group>
  </group>
}

function Orrery({ color }: { color: string }) {
  const orbits = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (orbits.current[0]) orbits.current[0].rotation.y = t * 0.5
    if (orbits.current[1]) orbits.current[1].rotation.y = -t * 0.32 + 1.3
  })
  const rings = [
    { tilt: [0.5, 0, 0.15] as [number, number, number], radius: 0.28, planet: '#7d9a8a', size: 0.035 },
    { tilt: [-0.6, 0, -0.2] as [number, number, number], radius: 0.2, planet: '#b26b4e', size: 0.028 },
  ]
  return <group>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow><cylinderGeometry args={[0.3, 0.33, 0.06, 40]} /><meshStandardMaterial color="#3e4942" roughness={0.5} /></mesh>
    <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.018, 0.024, 0.38, 12]} /><meshStandardMaterial color="#b29160" metalness={0.55} roughness={0.35} /></mesh>
    <mesh position={[0, 0.46, 0]} castShadow><sphereGeometry args={[0.1, 24, 18]} /><meshStandardMaterial color="#e8b96a" emissive="#b47a2e" emissiveIntensity={0.35} roughness={0.4} /></mesh>
    <mesh position={[0, 0.61, 0]}><cylinderGeometry args={[0.006, 0.006, 0.1, 8]} /><meshStandardMaterial color="#b29160" metalness={0.55} roughness={0.35} /></mesh>
    {rings.map((ring, index) => <group key={index} ref={element => { orbits.current[index] = element }} position={[0, 0.46, 0]} rotation={ring.tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[ring.radius, 0.008, 8, 64]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[ring.radius, 0, 0]} castShadow><sphereGeometry args={[ring.size, 16, 12]} /><meshStandardMaterial color={ring.planet} roughness={0.55} /></mesh>
    </group>)}
  </group>
}

function Cat({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.045, 0]} castShadow receiveShadow><cylinderGeometry args={[0.3, 0.33, 0.09, 40]} /><meshStandardMaterial color="#b7643f" roughness={0.95} /></mesh>
    <mesh position={[0, 0.26, 0]} scale={[1.2, 0.72, 1]} castShadow><sphereGeometry args={[0.24, 28, 20]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
    <mesh position={[0.2, 0.33, 0.05]} castShadow><sphereGeometry args={[0.135, 24, 18]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
    {[-0.055, 0.06].map(dz => <mesh key={dz} position={[0.26, 0.43, 0.05 + dz]} rotation={[0, 0, -0.2]} castShadow><coneGeometry args={[0.045, 0.09, 4]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>)}
    <mesh position={[-0.04, 0.1, 0.12]} rotation={[-1.35, 0, 0.2]} castShadow><torusGeometry args={[0.22, 0.032, 10, 40, Math.PI * 1.3]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
  </group>
}

function Rug({ color }: { color: string }) {
  const shades = useMemo(() => {
    const base = new THREE.Color(color)
    return [base.clone().offsetHSL(0, 0.02, -0.05), base.clone(), base.clone().offsetHSL(0, 0.02, 0.05)]
  }, [color])
  return <group>
    <mesh position={[0, 0.009, 0]} receiveShadow><cylinderGeometry args={[1.15, 1.15, 0.018, 64]} /><meshStandardMaterial color={shades[0]} roughness={1} /></mesh>
    <mesh position={[0, 0.011, 0]} receiveShadow><cylinderGeometry args={[0.82, 0.82, 0.02, 64]} /><meshStandardMaterial color={shades[1]} roughness={1} /></mesh>
    <mesh position={[0, 0.013, 0]} receiveShadow><cylinderGeometry args={[0.34, 0.34, 0.022, 48]} /><meshStandardMaterial color={shades[2]} roughness={1} /></mesh>
  </group>
}

function Stanchion({ color }: { color: string }) {
  const rope = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.7, 0.86, 0), new THREE.Vector3(0, 0.64, 0), new THREE.Vector3(0.7, 0.86, 0))
    return new THREE.TubeGeometry(curve, 32, 0.026, 10, false)
  }, [])
  useEffect(() => () => rope.dispose(), [rope])
  return <group>
    {[-0.7, 0.7].map(x => <group key={x}>
      <mesh position={[x, 0.015, 0]} castShadow receiveShadow><cylinderGeometry args={[0.14, 0.15, 0.03, 28]} /><meshStandardMaterial color="#3e4942" metalness={0.55} roughness={0.4} /></mesh>
      <mesh position={[x, 0.47, 0]} castShadow><cylinderGeometry args={[0.017, 0.02, 0.89, 12]} /><meshStandardMaterial color="#3e4942" metalness={0.55} roughness={0.4} /></mesh>
      <mesh position={[x, 0.925, 0]} castShadow><sphereGeometry args={[0.032, 16, 12]} /><meshStandardMaterial color="#c8b78e" metalness={0.7} roughness={0.3} /></mesh>
    </group>)}
    <mesh geometry={rope} castShadow><meshStandardMaterial color={color} roughness={1} /></mesh>
  </group>
}

function GooglyEyes({ spread = 0.052, y, z, r = 0.013 }: { spread?: number; y: number; z: number; r?: number }) {
  return <>{[-spread, spread].map(dx => <group key={dx} position={[dx, y, z]}>
    <mesh><sphereGeometry args={[r, 10, 8]} /><meshStandardMaterial color="#332b25" roughness={0.35} /></mesh>
    <mesh position={[r * 0.3, r * 0.4, r * 0.6]}><sphereGeometry args={[r * 0.3, 8, 6]} /><meshStandardMaterial color="#ffffff" roughness={0.2} /></mesh>
  </group>)}</>
}

function Figurine({ color }: { color: string }) {
  const skin = '#f7ddc0'
  const hair = '#5a4636'
  return <group>
    <mesh position={[0, 0.01, 0]} castShadow receiveShadow><cylinderGeometry args={[0.135, 0.145, 0.02, 36]} /><meshStandardMaterial color="#efe8da" roughness={0.55} /></mesh>
    <mesh position={[0, 0.021, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.135, 0.005, 8, 40]} /><meshStandardMaterial color="#d9b36a" metalness={0.6} roughness={0.3} /></mesh>
    {[-0.038, 0.038].map(x => <group key={x}>
      <mesh position={[x, 0.05, 0]} castShadow><cylinderGeometry args={[0.016, 0.018, 0.06, 12]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
      <mesh position={[x, 0.026, 0.01]} scale={[1, 0.7, 1.4]} castShadow><sphereGeometry args={[0.024, 12, 10]} /><meshStandardMaterial color="#8a5a44" roughness={0.6} /></mesh>
    </group>)}
    <mesh position={[0, 0.115, 0]} castShadow><cylinderGeometry args={[0.046, 0.108, 0.095, 28]} /><meshStandardMaterial color={color} roughness={0.62} /></mesh>
    <mesh position={[0, 0.162, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.1, 0.013, 10, 36]} /><meshStandardMaterial color={color} roughness={0.62} /></mesh>
    <mesh position={[0, 0.196, 0]} castShadow><cylinderGeometry args={[0.042, 0.052, 0.072, 24]} /><meshStandardMaterial color={color} roughness={0.62} /></mesh>
    <mesh position={[0, 0.233, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.045, 0.008, 8, 28]} /><meshStandardMaterial color="#f2e6d2" roughness={0.7} /></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * 0.063, 0.2, 0.004]} rotation={[0, 0, side * 0.55]}>
      <mesh position={[0, -0.03, 0]} castShadow><cylinderGeometry args={[0.013, 0.015, 0.062, 12]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
      <mesh position={[0, -0.068, 0]} castShadow><sphereGeometry args={[0.017, 12, 10]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
    </group>)}
    <mesh position={[0, 0.375, 0]} castShadow><sphereGeometry args={[0.155, 32, 26]} /><meshStandardMaterial color={skin} roughness={0.8} /></mesh>
    <mesh position={[0, 0.392, -0.022]} scale={[1.04, 0.94, 1.02]} castShadow><sphereGeometry args={[0.158, 32, 26]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>
    {[-0.068, 0, 0.068].map((x, index) => <mesh key={x} position={[x, 0.443 + (index === 1 ? 0.012 : 0), 0.115]} scale={[1, 0.6, 0.5]} castShadow><sphereGeometry args={[0.056, 16, 12]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>)}
    {[-0.142, 0.142].map(x => <mesh key={x} position={[x, 0.352, 0.048]} castShadow><cylinderGeometry args={[0.021, 0.026, 0.09, 14]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>)}
    {[-0.142, 0.142].map(x => <mesh key={x} position={[x, 0.502, -0.016]} castShadow><sphereGeometry args={[0.052, 18, 14]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>)}
    <GooglyEyes spread={0.058} y={0.385} z={0.126} r={0.017} />
    {[-0.094, 0.094].map(x => <mesh key={x} position={[x, 0.35, 0.108]} scale={[1, 0.62, 0.45]}><sphereGeometry args={[0.02, 10, 8]} /><meshStandardMaterial color="#f2a58e" roughness={0.9} /></mesh>)}
    <mesh position={[0, 0.337, 0.146]} rotation={[1.25, 0, 0]}><torusGeometry args={[0.013, 0.0035, 6, 16, Math.PI]} /><meshStandardMaterial color="#c96f5e" roughness={0.7} /></mesh>
  </group>
}

function Kitten({ color }: { color: string }) {
  const muzzle = '#f6ead9'
  const innerEar = '#f2b8ac'
  const tail = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, 0.045, -0.15),
      new THREE.Vector3(0.17, 0.05, -0.1),
      new THREE.Vector3(0.195, 0.055, 0.04),
      new THREE.Vector3(0.09, 0.06, 0.13),
    ])
    return new THREE.TubeGeometry(curve, 28, 0.026, 10, false)
  }, [])
  useEffect(() => () => tail.dispose(), [tail])
  return <group>
    {[-0.105, 0.105].map(x => <mesh key={x} position={[x, 0.17, -0.02]} scale={[0.72, 0.95, 0.88]} castShadow receiveShadow><sphereGeometry args={[0.15, 24, 18]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>)}
    <mesh position={[0, 0.2, 0.03]} scale={[0.85, 1.08, 0.82]} castShadow receiveShadow><sphereGeometry args={[0.16, 26, 20]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    <mesh position={[0, 0.225, 0.125]} scale={[0.75, 1, 0.5]}><sphereGeometry args={[0.09, 18, 14]} /><meshStandardMaterial color={muzzle} roughness={0.95} /></mesh>
    {[-0.06, 0.06].map(x => <group key={x}>
      <mesh position={[x, 0.09, 0.1]} castShadow><cylinderGeometry args={[0.028, 0.032, 0.12, 14]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
      <mesh position={[x, 0.035, 0.112]} scale={[1, 0.7, 1.25]} castShadow><sphereGeometry args={[0.04, 14, 12]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    </group>)}
    <mesh position={[0, 0.43, 0.05]} castShadow><sphereGeometry args={[0.13, 26, 20]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    {[-0.075, 0.075].map(x => <group key={x} position={[x, 0.545, 0.028]} rotation={[0, 0, x < 0 ? -0.16 : 0.16]}>
      <mesh castShadow><coneGeometry args={[0.047, 0.098, 4]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
      <mesh position={[0, -0.008, 0.016]} scale={[0.55, 0.6, 0.7]}><coneGeometry args={[0.047, 0.098, 4]} /><meshStandardMaterial color={innerEar} roughness={0.95} /></mesh>
    </group>)}
    <mesh position={[0, 0.405, 0.15]} scale={[1.12, 0.72, 0.7]}><sphereGeometry args={[0.052, 16, 12]} /><meshStandardMaterial color={muzzle} roughness={0.95} /></mesh>
    <mesh position={[0, 0.428, 0.197]}><sphereGeometry args={[0.009, 10, 8]} /><meshStandardMaterial color="#e2907f" roughness={0.6} /></mesh>
    <GooglyEyes spread={0.05} y={0.452} z={0.152} r={0.013} />
    {[-0.1, 0.1].map(x => [-0.25, 0.12].map(dy => <mesh key={`${x}:${dy}`} position={[x, 0.418 + dy, 0.128]} rotation={[0, x < 0 ? 0.3 : -0.3, x < 0 ? -0.1 : 0.1]}><boxGeometry args={[0.07, 0.0022, 0.0022]} /><meshStandardMaterial color="#f8f4ec" roughness={0.8} /></mesh>))}
    <mesh geometry={tail} castShadow><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    <mesh position={[0.09, 0.06, 0.13]} castShadow><sphereGeometry args={[0.027, 12, 10]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
  </group>
}

function Puppy({ color }: { color: string }) {
  const shade = useMemo(() => new THREE.Color(color).offsetHSL(0, -0.04, 0.11), [color])
  return <group>
    {[-0.115, 0.115].map(x => <mesh key={x} position={[x, 0.175, -0.02]} scale={[0.7, 0.92, 0.88]} castShadow receiveShadow><sphereGeometry args={[0.16, 24, 18]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>)}
    <mesh position={[0, 0.2, 0.03]} scale={[0.88, 1.08, 0.85]} castShadow receiveShadow><sphereGeometry args={[0.17, 26, 20]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    {[-0.062, 0.062].map(x => <group key={x}>
      <mesh position={[x, 0.09, 0.105]} castShadow><cylinderGeometry args={[0.03, 0.034, 0.12, 14]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
      <mesh position={[x, 0.035, 0.118]} scale={[1, 0.7, 1.25]} castShadow><sphereGeometry args={[0.042, 14, 12]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    </group>)}
    <mesh position={[0, 0.45, 0.04]} castShadow><sphereGeometry args={[0.145, 26, 20]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
    <mesh position={[0, 0.412, 0.148]} scale={[1.12, 0.74, 0.85]} castShadow><sphereGeometry args={[0.06, 16, 12]} /><meshStandardMaterial color={shade} roughness={0.92} /></mesh>
    <mesh position={[0, 0.432, 0.198]}><sphereGeometry args={[0.016, 10, 8]} /><meshStandardMaterial color="#3a322b" roughness={0.4} /></mesh>
    <mesh position={[0, 0.365, 0.198]} rotation={[0.18, 0, 0]}><boxGeometry args={[0.034, 0.054, 0.012]} /><meshStandardMaterial color="#e0877f" roughness={0.7} /></mesh>
    {[-0.128, 0.128].map(x => <mesh key={x} position={[x, 0.485, 0.008]} rotation={[0.08, 0, x < 0 ? 0.52 : -0.52]} scale={[0.52, 1.3, 0.36]} castShadow><sphereGeometry args={[0.065, 16, 12]} /><meshStandardMaterial color={shade} roughness={0.92} /></mesh>)}
    <GooglyEyes spread={0.055} y={0.478} z={0.128} r={0.013} />
    {[-0.052, 0.052].map(x => <mesh key={x} position={[x, 0.516, 0.108]} scale={[1, 0.45, 0.5]}><sphereGeometry args={[0.022, 10, 8]} /><meshStandardMaterial color={shade} roughness={0.92} /></mesh>)}
    <mesh position={[0, 0.345, 0.045]} rotation={[1.42, 0, 0]} castShadow><torusGeometry args={[0.082, 0.012, 10, 30]} /><meshStandardMaterial color="#b8452f" roughness={0.6} /></mesh>
    <mesh position={[0, 0.312, 0.108]} castShadow><sphereGeometry args={[0.017, 12, 10]} /><meshStandardMaterial color="#d9b36a" metalness={0.65} roughness={0.3} /></mesh>
    <mesh position={[0, 0.315, -0.155]} rotation={[-0.85, 0, 0]} castShadow><torusGeometry args={[0.07, 0.026, 10, 24, 2.4]} /><meshStandardMaterial color={color} roughness={0.92} /></mesh>
  </group>
}

function Teddy({ color }: { color: string }) {
  const muzzle = '#e8cba0'
  return <group position={[0, -0.016, 0]}>
    <mesh position={[0, 0.21, 0]} scale={[0.95, 1.05, 0.85]} castShadow receiveShadow><sphereGeometry args={[0.17, 26, 20]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
    <mesh position={[0, 0.2, 0.1]} scale={[0.8, 0.95, 0.5]}><sphereGeometry args={[0.11, 18, 14]} /><meshStandardMaterial color={muzzle} roughness={0.96} /></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * 0.165, 0.3, 0.012]} rotation={[0, 0, side * 1.0]}>
      <mesh position={[0, -0.042, 0]} castShadow><cylinderGeometry args={[0.03, 0.034, 0.085, 14]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
      <mesh position={[0, -0.092, 0]} castShadow><sphereGeometry args={[0.04, 14, 12]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
    </group>)}
    {[-0.085, 0.085].map(x => <group key={x}>
      <mesh position={[x, 0.065, 0.06]} scale={[0.85, 0.7, 1.05]} castShadow><sphereGeometry args={[0.07, 16, 12]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
      <mesh position={[x, 0.06, 0.148]} scale={[1, 0.8, 0.4]}><sphereGeometry args={[0.032, 12, 10]} /><meshStandardMaterial color={muzzle} roughness={0.96} /></mesh>
    </group>)}
    <mesh position={[0, 0.48, 0.02]} castShadow><sphereGeometry args={[0.15, 26, 20]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
    {[-0.105, 0.105].map(x => <group key={x} position={[x, 0.605, -0.005]}>
      <mesh castShadow><sphereGeometry args={[0.055, 16, 12]} /><meshStandardMaterial color={color} roughness={0.96} /></mesh>
      <mesh position={[0, 0, 0.032]} scale={[1, 1, 0.5]}><sphereGeometry args={[0.033, 12, 10]} /><meshStandardMaterial color="#d9a08a" roughness={0.96} /></mesh>
    </group>)}
    <mesh position={[0, 0.448, 0.125]} scale={[1.15, 0.72, 0.68]}><sphereGeometry args={[0.06, 16, 12]} /><meshStandardMaterial color={muzzle} roughness={0.96} /></mesh>
    <mesh position={[0, 0.472, 0.176]}><sphereGeometry args={[0.016, 10, 8]} /><meshStandardMaterial color="#3a322b" roughness={0.4} /></mesh>
    <GooglyEyes spread={0.055} y={0.508} z={0.116} r={0.012} />
  </group>
}

function Bunny({ color }: { color: string }) {
  const inner = '#f0bcb0'
  const belly = '#faf5ec'
  return <group position={[0, -0.02, 0]}>
    <mesh position={[0, 0.195, 0]} scale={[0.88, 1.05, 0.82]} castShadow receiveShadow><sphereGeometry args={[0.155, 26, 20]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
    <mesh position={[0, 0.185, 0.09]} scale={[0.78, 1, 0.5]}><sphereGeometry args={[0.1, 18, 14]} /><meshStandardMaterial color={belly} roughness={0.95} /></mesh>
    {[-0.075, 0.075].map(x => <mesh key={x} position={[x, 0.05, 0.085]} scale={[0.75, 0.6, 1.3]} castShadow><sphereGeometry args={[0.05, 14, 12]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>)}
    {[-0.058, 0.058].map(x => <mesh key={x} position={[x, 0.245, 0.1]} castShadow><sphereGeometry args={[0.036, 12, 10]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>)}
    <mesh position={[0, 0.17, -0.13]} castShadow><sphereGeometry args={[0.05, 14, 12]} /><meshStandardMaterial color={belly} roughness={0.95} /></mesh>
    <mesh position={[0, 0.44, 0.02]} castShadow><sphereGeometry args={[0.14, 26, 20]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
    {[-0.062, 0.062].map(x => <group key={x} position={[x, 0.655, -0.008]} rotation={[0, 0, x < 0 ? -0.14 : 0.14]}>
      <mesh position={[0, 0.075, 0]} castShadow><cylinderGeometry args={[0.032, 0.036, 0.15, 14]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
      <mesh position={[0, 0.15, 0]} castShadow><sphereGeometry args={[0.034, 12, 10]} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
      <mesh position={[0, 0.07, 0.024]}><cylinderGeometry args={[0.018, 0.021, 0.11, 12]} /><meshStandardMaterial color={inner} roughness={0.95} /></mesh>
    </group>)}
    <GooglyEyes spread={0.05} y={0.462} z={0.116} r={0.012} />
    <mesh position={[0, 0.426, 0.152]}><sphereGeometry args={[0.008, 10, 8]} /><meshStandardMaterial color="#e2907f" roughness={0.6} /></mesh>
  </group>
}

const GASHAPON_CAPSULES: { position: [number, number, number]; color: string }[] = [
  { position: [-0.055, 0.335, 0.03], color: '#4f8a7c' },
  { position: [0.05, 0.338, -0.04], color: '#e0a13e' },
  { position: [0.015, 0.4, 0.02], color: '#7d8fb5' },
  { position: [-0.05, 0.408, -0.05], color: '#c96f5e' },
  { position: [0.09, 0.395, 0.05], color: '#e8d9a0' },
  { position: [-0.012, 0.355, -0.095], color: '#5f7d54' },
  { position: [0.07, 0.443, -0.012], color: '#b57ba0' },
]

function Gashapon({ color }: { color: string }) {
  return <group>
    <RoundedBox args={[0.4, 0.28, 0.36]} position={[0, 0.14, 0]} radius={0.02} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.5} /></RoundedBox>
    <RoundedBox args={[0.3, 0.13, 0.016]} position={[0, 0.115, 0.183]} radius={0.006} smoothness={2}><meshStandardMaterial color="#f2e6d0" roughness={0.7} /></RoundedBox>
    <RoundedBox args={[0.11, 0.055, 0.02]} position={[0, 0.08, 0.192]} radius={0.006} smoothness={2}><meshStandardMaterial color="#3a332c" roughness={0.6} /></RoundedBox>
    <mesh position={[0, 0.225, 0.185]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.034, 0.034, 0.026, 20]} /><meshStandardMaterial color="#f2e6d0" roughness={0.5} /></mesh>
    <mesh position={[0, 0.225, 0.2]}><sphereGeometry args={[0.021, 14, 10]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
    <mesh position={[0, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.185, 0.011, 10, 40]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    <mesh position={[0, 0.44, 0]} scale={[1, 0.88, 1]}><sphereGeometry args={[0.185, 32, 24]} /><meshPhysicalMaterial color="#e7f2ec" transparent opacity={0.16} roughness={0.06} depthWrite={false} /></mesh>
    {GASHAPON_CAPSULES.map((capsule, index) => <mesh key={index} position={capsule.position} castShadow><sphereGeometry args={[0.045, 16, 12]} /><meshStandardMaterial color={capsule.color} roughness={0.35} /></mesh>)}
    <mesh position={[0, 0.605, 0]} castShadow><cylinderGeometry args={[0.045, 0.05, 0.022, 20]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
  </group>
}

const MATRYOSHKA_PROFILE: [number, number][] = [[0, 0], [0.135, 0], [0.15, 0.008], [0.168, 0.05], [0.178, 0.14], [0.168, 0.24], [0.142, 0.33], [0.115, 0.4], [0.122, 0.45], [0.128, 0.51], [0.118, 0.56], [0.08, 0.6], [0.032, 0.62], [0, 0.625]]

function Matryoshka({ color }: { color: string }) {
  const geometry = useMemo(() => new THREE.LatheGeometry(MATRYOSHKA_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 48), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const dark = useMemo(() => new THREE.Color(color).offsetHSL(0, 0.02, -0.1), [color])
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.3} metalness={0.05} /></mesh>
    <mesh position={[0, 0.415, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.108, 0.018, 10, 40]} /><meshStandardMaterial color={dark} roughness={0.32} /></mesh>
    <mesh position={[0, 0.505, 0.098]} scale={[1, 1.12, 0.5]}><sphereGeometry args={[0.058, 18, 14]} /><meshStandardMaterial color="#f7ddc0" roughness={0.5} /></mesh>
    {[-0.024, 0.024].map(x => <mesh key={x} position={[x, 0.515, 0.138]}><sphereGeometry args={[0.007, 8, 6]} /><meshStandardMaterial color="#332b25" roughness={0.4} /></mesh>)}
    {[-0.045, 0.045].map(x => <mesh key={x} position={[x, 0.49, 0.128]} scale={[1, 0.7, 0.4]}><sphereGeometry args={[0.012, 10, 8]} /><meshStandardMaterial color="#f2a58e" roughness={0.9} /></mesh>)}
    <mesh position={[0, 0.185, 0.122]} scale={[1, 1.25, 0.42]}><sphereGeometry args={[0.072, 20, 16]} /><meshStandardMaterial color="#f4e6c4" roughness={0.35} /></mesh>
    {[[-0.025, 0.155], [0.02, 0.2], [-0.008, 0.245]].map(([x, y], index) => <mesh key={index} position={[x, y, 0.152]} scale={[1, 1, 0.4]}><sphereGeometry args={[0.011, 10, 8]} /><meshStandardMaterial color="#57776b" roughness={0.4} /></mesh>)}
  </group>
}

const CANDY_COLORS = ['#e05a5a', '#e8a13e', '#5f8a7c', '#7d8fb5', '#d95f8a', '#e8d9a0']
const CANDY_POSITIONS: [number, number, number][] = [[-0.045, 0.045, 0.02], [0.04, 0.045, -0.03], [0.005, 0.045, 0.055], [-0.03, 0.048, -0.05], [0.055, 0.05, 0.035], [-0.01, 0.098, 0.01], [0.05, 0.095, -0.01], [-0.05, 0.095, -0.005], [0.015, 0.098, -0.055], [-0.04, 0.095, 0.045]]

function CandyJar({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.135, 0]}><cylinderGeometry args={[0.125, 0.125, 0.23, 32, 1, true]} /><meshPhysicalMaterial color="#e7f2ec" transparent opacity={0.14} roughness={0.06} depthWrite={false} /></mesh>
    <mesh position={[0, 0.022, 0]}><cylinderGeometry args={[0.125, 0.125, 0.012, 32]} /><meshPhysicalMaterial color="#e7f2ec" transparent opacity={0.25} roughness={0.1} depthWrite={false} /></mesh>
    {CANDY_POSITIONS.map((position, index) => <mesh key={index} position={position} castShadow><sphereGeometry args={[0.033, 14, 12]} /><meshStandardMaterial color={index % 3 === 0 ? color : CANDY_COLORS[index % CANDY_COLORS.length]} roughness={0.25} /></mesh>)}
    <mesh position={[0, 0.264, 0]} castShadow><cylinderGeometry args={[0.136, 0.136, 0.028, 32]} /><meshStandardMaterial color="#9a7b57" roughness={0.65} /></mesh>
    <mesh position={[0, 0.294, 0]} castShadow><sphereGeometry args={[0.028, 14, 10]} /><meshStandardMaterial color="#9a7b57" roughness={0.6} /></mesh>
  </group>
}

const TRAY_BEAD_COLORS = ['#b0654f', '#57776b', '#d9b36a', '#7d8fb5', '#c96f5e', '#e8d9a0', '#5f7d54', '#b57ba0']
const TRAY_BEAD_POSITIONS: [number, number, number][] = [[-0.17, 0.056, 0.02], [-0.13, 0.056, -0.06], [-0.09, 0.056, 0.08], [-0.05, 0.056, -0.02], [0.13, 0.056, -0.07], [0.17, 0.056, 0.05], [-0.15, 0.056, -0.1], [0.1, 0.056, 0.09], [0.19, 0.056, -0.02], [-0.02, 0.056, -0.09]]

function BeadTray({ color }: { color: string }) {
  const strand = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 0.054, 0.06), new THREE.Vector3(-0.07, 0.058, 0.095), new THREE.Vector3(0.06, 0.058, 0.045), new THREE.Vector3(0.18, 0.054, 0.075)])
    return new THREE.TubeGeometry(curve, 24, 0.0035, 8, false)
  }, [])
  useEffect(() => () => strand.dispose(), [strand])
  return <group>
    <RoundedBox args={[0.5, 0.045, 0.32]} position={[0, 0.0225, 0]} radius={0.008} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.7} /></RoundedBox>
    <RoundedBox args={[0.44, 0.008, 0.26]} position={[0, 0.048, 0]} radius={0.003} smoothness={2} receiveShadow><meshStandardMaterial color="#f0e8d8" roughness={0.92} /></RoundedBox>
    {TRAY_BEAD_POSITIONS.map((position, index) => <mesh key={index} position={position} castShadow><sphereGeometry args={[0.014, 12, 10]} /><meshStandardMaterial color={TRAY_BEAD_COLORS[index % TRAY_BEAD_COLORS.length]} roughness={0.2} metalness={0.15} /></mesh>)}
    <mesh geometry={strand}><meshStandardMaterial color="#e8ddc8" roughness={0.9} /></mesh>
    {[[-0.16, 0.065], [-0.1, 0.07], [-0.04, 0.064], [0.02, 0.06], [0.09, 0.062]].map(([x, y], index) => <mesh key={index} position={[x, y, 0.06 + (index % 2) * 0.01]} castShadow><sphereGeometry args={[0.0135, 12, 10]} /><meshStandardMaterial color={TRAY_BEAD_COLORS[(index + 2) % TRAY_BEAD_COLORS.length]} roughness={0.2} metalness={0.15} /></mesh>)}
    <group position={[0.2, 0.07, -0.1]}>
      <mesh castShadow><cylinderGeometry args={[0.026, 0.026, 0.044, 16]} /><meshStandardMaterial color="#f0e8d8" roughness={0.85} /></mesh>
      <mesh position={[0, 0.004, 0]}><cylinderGeometry args={[0.029, 0.029, 0.02, 16]} /><meshStandardMaterial color="#c96f5e" roughness={0.8} /></mesh>
    </group>
  </group>
}

function MissingModel({ loading = false }: { loading?: boolean }) {
  return <group>
    <mesh position={[0, 0.58, 0]}><boxGeometry args={[0.85, 1.16, 0.85]} /><meshStandardMaterial color={loading ? '#abbbae' : '#d87553'} transparent opacity={0.12} /></mesh>
    <mesh position={[0, 0.58, 0]}><boxGeometry args={[0.85, 1.16, 0.85]} /><meshBasicMaterial color={loading ? '#8d9c8d' : '#c96542'} wireframe /></mesh>
    {!loading && <mesh position={[0, 0.58, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.12, 0.5, 0.12]} /><meshStandardMaterial color="#c96542" /></mesh>}
  </group>
}

class ModelBoundary extends Component<{ children: ReactNode; onError?: (message: string) => void; name: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError?.(`「${this.props.name}」无法显示，请检查 GLB 文件是否完整；当前以橙色占位框显示。`) }
  render() { return this.state.failed ? <MissingModel /> : this.props.children }
}

function ImportedModel({ url }: { url: string }) {
  const gltf = useGLTF(url, false)
  const result = useMemo(() => {
    const scene = clone(gltf.scene)
    const materials: THREE.Material[] = []
    scene.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return
      node.castShadow = true
      node.receiveShadow = true
      if (Array.isArray(node.material)) node.material = node.material.map(material => { const copied = material.clone(); materials.push(copied); return copied })
      else { node.material = node.material.clone(); materials.push(node.material) }
    })
    scene.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    if (box.isEmpty() || !Number.isFinite(size.length())) throw new Error('模型缺少可显示的几何数据')
    const scale = 1.2 / Math.max(size.x, size.y, size.z, 0.01)
    return { scene, materials, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] }
  }, [gltf.scene])
  useEffect(() => () => result.materials.forEach(material => material.dispose()), [result])
  return <group position={result.offset} scale={result.scale}><primitive object={result.scene} dispose={null} /></group>
}

// Bundled models retain their authored metre scale; importing user GLBs keeps its separate normalization.
function LibraryModel({ url, length }: { url: string; length?: number }) {
  const { scene } = useGLTF(url, false)
  const model = useMemo(() => {
    const result = clone(scene)
    const bounds = new THREE.Box3().setFromObject(result)
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = length ? length / Math.max(...bounds.getSize(new THREE.Vector3()).toArray()) : 1
    result.scale.multiplyScalar(scale)
    result.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    result.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true } })
    return result
  }, [scene, length])
  return <primitive object={model} dispose={null} />
}
export default function ObjectModel({ object, url, onError }: { object: SceneObject; url?: string; onError?: (message: string) => void }) {
  switch (object.kind) {
    case 'decor-model': {
      const asset = DECOR_MODELS.find(item => item.id === object.decorId)
      return asset ? <ModelBoundary key={asset.id} name={object.name} onError={onError}><Suspense fallback={<MissingModel loading />}><LibraryModel url={asset.url} length={Math.max(...asset.size)} /></Suspense></ModelBoundary> : <MissingModel />
    }
    case 'welcome-counter':
    case 'marquee-sign':
    case 'arched-screen':
    case 'gallery-poster':
    case 'planter-box':
    case 'reading-rug': return <DecorFurniture object={object} />
    case 'wayfinding-sign': return <WayfindingSign object={object} />
    case 'plinth': return <Plinth color={object.color} />
    case 'glass-case': return <GlassCase color={object.color} />
    case 'shelf': return <Shelf color={object.color || WOOD} />
    case 'bench': return <Bench color={object.color || WOOD} />
    case 'plant': return <Plant color={object.color} />
    case 'lamp': return <Lamp color={object.color} />
    case 'vase': return <Vase color={object.color} />
    case 'arch': return <Arch color={object.color} />
    case 'sculpture': return <Sculpture color={object.color} />
    case 'pedestal': return <Pedestal color={object.color} />
    case 'easel': return <Easel color={object.color} />
    case 'partition': return <Partition color={object.color} />
    case 'stones': return <Stones color={object.color} />
    case 'mobile': return <Mobile color={object.color} />
    case 'orrery': return <Orrery color={object.color} />
    case 'cat': return <Cat color={object.color} />
    case 'rug': return <Rug color={object.color} />
    case 'stanchion': return <Stanchion color={object.color} />
    case 'figurine': return <Figurine color={object.color} />
    case 'kitten': return <Kitten color={object.color} />
    case 'puppy': return <Puppy color={object.color} />
    case 'bracelet':
    case 'bracelet-jade':
    case 'bracelet-amber':
    case 'bracelet-crystal':
    case 'bracelet-pearl':
    case 'bracelet-obsidian': return <Bracelet color={object.color} style={JEWELRY_STYLES[object.kind]} />
    case 'jewelry-counter': return <JewelryCounter color={object.color} />
    case 'collector-cabinet': return <CollectorCabinet color={object.color} />
    case 'display-table': return <DisplayTable color={object.color} />
    case 'toy-car': return <ModelBoundary name={object.name} onError={onError}><Suspense fallback={<MissingModel loading />}><LibraryModel url={publicAsset('models/toy-car.glb')} length={0.42} /></Suspense></ModelBoundary>
    case 'rubber-duck': return <ModelBoundary name={object.name} onError={onError}><Suspense fallback={<MissingModel loading />}><LibraryModel url={publicAsset('models/rubber-duck-toy.glb')} /></Suspense></ModelBoundary>
    case 'arm-model':
    case 'wrist-display': return <ModelBoundary name={object.name} onError={onError}><WristDisplay color={object.color} /></ModelBoundary>
    case 'bracelet-steps': return <BraceletSteps color={object.color} />
    case 'bracelet-stand': return <BraceletStand color={object.color} />
    case 'teddy': return <Teddy color={object.color} />
    case 'bunny': return <Bunny color={object.color} />
    case 'gashapon': return <Gashapon color={object.color} />
    case 'matryoshka': return <Matryoshka color={object.color} />
    case 'candy-jar': return <CandyJar color={object.color} />
    case 'bead-tray': return <BeadTray color={object.color} />
    case 'imported': return url ? <ModelBoundary key={url} name={object.name} onError={onError}><Suspense fallback={<MissingModel loading />}><ImportedModel url={url} /></Suspense></ModelBoundary> : <MissingModel />
  }
}
