import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { SceneObject, Vec3 } from '../types'

type Finish = 'body' | 'wood' | 'brass' | 'dark' | 'cream' | 'paper' | 'coral' | 'sage' | 'blue' | 'leaf' | 'leafLight' | 'soil' | 'glass'
type Parts = Partial<Record<Finish, THREE.BufferGeometry[]>>
type Geometry = Partial<Record<Finish, THREE.BufferGeometry>>

/** Authored metres with Y up, a bottom anchor, and +Z facing the visitor. */
export const DECOR_FURNITURE_DIMENSIONS = {
  'welcome-counter': [2.2, 1.22, 0.82],
  'marquee-sign': [1, 1.7, 0.35],
  'arched-screen': [1.5, 2.4, 0.3],
  'gallery-poster': [1.05, 1.78, 0.42],
  'planter-box': [1.5, 0.8, 0.5],
  'reading-rug': [3, 0.025, 2.4],
} satisfies Record<string, Vec3>

function add(parts: Parts, finish: Finish, geometry: THREE.BufferGeometry, position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]) {
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  ))
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  if (flat !== geometry) geometry.dispose()
  ;(parts[finish] ??= []).push(flat)
}

function box(parts: Parts, finish: Finish, position: Vec3, size: Vec3, radius = 0) {
  add(parts, finish, radius > 0 ? new RoundedBoxGeometry(...size, 2, radius) : new THREE.BoxGeometry(...size), position)
}

function merge(parts: Parts): Geometry {
  const result: Geometry = {}
  for (const finish of Object.keys(parts) as Finish[]) {
    const pieces = parts[finish]!
    const joined = mergeGeometries(pieces, false)!
    joined.computeBoundingBox()
    joined.computeBoundingSphere()
    result[finish] = joined
    pieces.forEach(piece => piece.dispose())
  }
  return result
}

function archShape(halfWidth: number, bottom: number, shoulder: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-halfWidth, bottom)
  shape.lineTo(-halfWidth, shoulder)
  shape.absarc(0, shoulder, halfWidth, Math.PI, 0, true)
  shape.lineTo(halfWidth, bottom)
  shape.closePath()
  return shape
}

function extrusion(shape: THREE.Shape, depth: number, bevel = 0.008) {
  const result = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 32 })
  result.translate(0, 0, -depth / 2)
  return result
}

function counterGeometry() {
  const parts: Parts = {}
  box(parts, 'dark', [0, 0.033, 0], [2.08, 0.066, 0.71], 0.016)
  box(parts, 'brass', [0, 0.09, 0], [2.12, 0.048, 0.75], 0.016)
  box(parts, 'body', [0, 0.564, 0], [2.14, 0.9, 0.7], 0.035)
  box(parts, 'wood', [0, 0.548, 0.356], [2.035, 0.748, 0.015], 0.007)
  // Cabinet joinery and inset fluting catch the light without filling the counter with clutter.
  for (const x of [-0.51, 0.51]) {
    box(parts, 'body', [x, 0.431, 0.369], [0.982, 0.49, 0.018], 0.012)
    for (let index = 0; index < 14; index++) box(parts, 'cream', [x - 0.447 + index * 0.069, 0.429, 0.379], [0.022, 0.426, 0.008])
    box(parts, 'body', [x, 0.794, 0.369], [0.982, 0.187, 0.018], 0.01)
    box(parts, 'brass', [x, 0.794, 0.389], [0.206, 0.012, 0.015], 0.004)
    for (const dx of [-0.083, 0.083]) box(parts, 'brass', [x + dx, 0.794, 0.382], [0.012, 0.012, 0.016])
  }
  box(parts, 'brass', [0, 1.025, 0], [2.18, 0.018, 0.8], 0.012)
  box(parts, 'cream', [0, 1.057, 0], [2.2, 0.046, 0.82], 0.022)
  box(parts, 'wood', [0.76, 1.094, -0.08], [0.36, 0.028, 0.36], 0.012)
  box(parts, 'dark', [0.76, 1.16, -0.11], [0.24, 0.1, 0.19], 0.012)
  box(parts, 'glass', [0.76, 1.213, -0.11], [0.194, 0.004, 0.134], 0.002)
  // Two gift boxes with satin ribbons make the welcome desk feel ready to open.
  for (const gift of [
    { x: -0.64, y: 1.147, z: 0.025, size: [0.34, 0.14, 0.28] as Vec3, finish: 'sage' as Finish },
    { x: -0.235, y: 1.131, z: 0.095, size: [0.24, 0.102, 0.22] as Vec3, finish: 'coral' as Finish },
  ]) {
    box(parts, gift.finish, [gift.x, gift.y, gift.z], gift.size, 0.008)
    box(parts, 'paper', [gift.x, gift.y + gift.size[1] / 2 - 0.015, gift.z], [gift.size[0] + 0.006, 0.028, gift.size[2] + 0.006], 0.005)
    box(parts, 'brass', [gift.x, gift.y + gift.size[1] / 2 + 0.001, gift.z], [0.022, 0.002, gift.size[2] + 0.012])
    box(parts, 'brass', [gift.x, gift.y + gift.size[1] / 2 + 0.002, gift.z], [gift.size[0] + 0.012, 0.002, 0.019])
  }
  return merge(parts)
}

function signGeometry() {
  const parts: Parts = {}
  box(parts, 'dark', [0, 0.024, 0], [1, 0.048, 0.35], 0.018)
  box(parts, 'brass', [0, 0.053, 0], [0.91, 0.012, 0.28], 0.004)
  for (const x of [-0.4, 0.4]) box(parts, 'brass', [x, 0.155, 0], [0.025, 0.202, 0.025], 0.004)
  add(parts, 'brass', extrusion(archShape(0.444, 0.245, 1.247), 0.092, 0.009))
  add(parts, 'body', extrusion(archShape(0.418, 0.269, 1.247), 0.103, 0.005))
  for (const side of [-1, 1]) {
    add(parts, 'cream', new THREE.TorusGeometry(0.374, 0.0055, 6, 64, Math.PI), [0, 1.247, side * 0.058])
    box(parts, 'cream', [0, 0.322, side * 0.059], [0.718, 0.006, 0.004])
  }
  return merge(parts)
}

function screenGeometry() {
  const parts: Parts = {}
  for (const x of [-0.56, 0.56]) {
    box(parts, 'dark', [x, 0.025, 0], [0.38, 0.05, 0.3], 0.016)
    box(parts, 'brass', [x, 0.056, 0], [0.3, 0.012, 0.23], 0.005)
  }
  const frame = archShape(0.712, 0.069, 1.667)
  const inner = new THREE.Path()
  inner.moveTo(-0.651, 0.145)
  inner.lineTo(0.651, 0.145)
  inner.lineTo(0.651, 1.667)
  inner.absarc(0, 1.667, 0.651, 0, Math.PI, false)
  inner.closePath()
  frame.holes.push(inner)
  add(parts, 'wood', extrusion(frame, 0.12, 0.012))
  add(parts, 'glass', extrusion(archShape(0.646, 0.148, 1.667), 0.009, 0), [0, 0, 0.023])
  for (let index = 0; index < 17; index++) {
    const x = -0.614 + index * 0.07675
    const top = 1.667 + Math.sqrt(0.646 ** 2 - x ** 2)
    box(parts, 'body', [x, (top + 0.147) / 2, -0.008], [0.021, top - 0.147, 0.034], 0.006)
  }
  box(parts, 'brass', [0, 0.163, 0.063], [1.296, 0.014, 0.01], 0.004)
  return merge(parts)
}

function posterGeometry() {
  const parts: Parts = {}
  box(parts, 'dark', [0, 0.027, 0], [0.89, 0.054, 0.42], 0.016)
  box(parts, 'brass', [0, 0.058, 0], [0.76, 0.008, 0.3], 0.003)
  for (const x of [-0.365, 0.365]) box(parts, 'wood', [x, 0.369, 0], [0.038, 0.622, 0.045], 0.007)
  box(parts, 'wood', [0, 1.12, 0], [1.05, 1.32, 0.076], 0.012)
  for (const side of [-1, 1]) {
    const z = side * 0.043
    box(parts, 'paper', [0, 1.12, z], [0.938, 1.208, 0.009], 0.003)
    for (const x of [-0.484, 0.484]) box(parts, 'brass', [x, 1.12, z], [0.008, 1.233, 0.006])
    for (const y of [0.507, 1.733]) box(parts, 'brass', [0, y, z], [0.973, 0.008, 0.006])
    const rotation: Vec3 = [0, side < 0 ? Math.PI : 0, 0]
    add(parts, 'coral', new THREE.CircleGeometry(0.176, 64), [side * 0.162, 1.405, side * 0.049], rotation)
    add(parts, 'sage', new THREE.ShapeGeometry(archShape(0.178, -0.22, 0.036)), [-side * 0.15, 1.068, side * 0.05], rotation)
    add(parts, 'brass', new THREE.RingGeometry(0.198, 0.202, 64, 1, Math.PI * 0.09, Math.PI * 1.76), [-side * 0.157, 1.298, side * 0.052], rotation)
    box(parts, 'blue', [side * 0.19, 0.942, side * 0.05], [0.222, 0.009, 0.003])
    box(parts, 'blue', [side * 0.175, 0.908, side * 0.05], [0.192, 0.005, 0.003])
    for (let index = 0; index < 5; index++) box(parts, 'dark', [-side * 0.127, 0.65 + index * 0.017, side * 0.051], [0.244 - index * 0.014, 0.003, 0.002])
  }
  return merge(parts)
}

function stem(parts: Parts, start: THREE.Vector3, end: THREE.Vector3) {
  const direction = end.clone().sub(start)
  const geometry = new THREE.CylinderGeometry(0.0028, 0.004, direction.length(), 6)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
  add(parts, 'leaf', geometry, start.clone().add(end).multiplyScalar(0.5).toArray() as Vec3)
}

function planterGeometry() {
  const parts: Parts = {}
  for (const x of [-0.63, 0.63]) for (const z of [-0.16, 0.16]) add(parts, 'dark', new THREE.CylinderGeometry(0.024, 0.028, 0.07, 12), [x, 0.035, z])
  box(parts, 'body', [0, 0.212, 0], [1.5, 0.302, 0.5], 0.035)
  box(parts, 'soil', [0, 0.358, 0], [1.416, 0.014, 0.416], 0.019)
  for (const x of [-0.728, 0.728]) box(parts, 'brass', [x, 0.364, 0], [0.016, 0.012, 0.435], 0.003)
  for (const z of [-0.228, 0.228]) {
    box(parts, 'brass', [0, 0.364, z], [1.47, 0.012, 0.016], 0.003)
    for (let index = 0; index < 29; index++) box(parts, 'cream', [-0.674 + index * 0.0481, 0.21, Math.sign(z) * 0.245], [0.01, 0.219, 0.005])
  }
  for (let plant = 0; plant < 7; plant++) {
    const origin = new THREE.Vector3(-0.6 + plant * 0.2, 0.367, plant % 2 === 0 ? -0.065 : 0.055)
    const height = 0.318 + (plant % 3) * 0.035
    const top = origin.clone().add(new THREE.Vector3(0.011 * Math.sin(plant), height, 0))
    stem(parts, origin, top)
    for (let leaf = 0; leaf < 8; leaf++) {
      const angle = plant * 0.57 + leaf * 2.39996
      const y = 0.066 + leaf * 0.033
      const reach = 0.035 + (leaf % 3) * 0.012
      const attachment = origin.clone().add(new THREE.Vector3(0, y, 0))
      const center = attachment.clone().add(new THREE.Vector3(Math.cos(angle) * reach, 0.035, Math.sin(angle) * reach))
      stem(parts, attachment, center)
      add(parts, leaf % 3 === 0 ? 'leafLight' : 'leaf', new THREE.SphereGeometry(1, 10, 8), center.toArray() as Vec3, [Math.sin(angle) * 0.55, angle, -Math.cos(angle) * 0.64], [0.021, 0.066, 0.007])
    }
  }
  return merge(parts)
}

function rugGeometry() {
  const parts: Parts = {}
  box(parts, 'cream', [0, 0.011, 0], [2.88, 0.022, 2.28], 0.007)
  for (const x of [-1.361, 1.361]) box(parts, 'body', [x, 0.023, 0], [0.073, 0.004, 2.197], 0.002)
  for (const z of [-1.061, 1.061]) box(parts, 'body', [0, 0.023, z], [2.723, 0.004, 0.073], 0.002)
  for (const x of [-1.283, 1.283]) box(parts, 'brass', [x, 0.023, 0], [0.008, 0.003, 2.027])
  for (const z of [-0.975, 0.975]) box(parts, 'brass', [0, 0.023, z], [2.566, 0.003, 0.008])
  // Fine warp threads are baked into one cream mesh; the fringe stays inside the declared footprint.
  for (let index = 0; index < 80; index++) {
    const x = -1.405 + index * 0.03557
    for (const side of [-1, 1]) box(parts, 'paper', [x, 0.01, side * 1.163], [0.007, 0.004, 0.074])
  }
  for (let index = 0; index < 102; index++) box(parts, 'paper', [0, 0.0226, -0.961 + index * 0.019], [2.525, 0.001, 0.0015])
  return merge(parts)
}

const FACTORIES = {
  'welcome-counter': counterGeometry,
  'marquee-sign': signGeometry,
  'arched-screen': screenGeometry,
  'gallery-poster': posterGeometry,
  'planter-box': planterGeometry,
  'reading-rug': rugGeometry,
}

function SignFace() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1536
    const context = canvas.getContext('2d')!
    context.textAlign = 'center'
    context.fillStyle = '#f2e8d3'
    context.font = '500 38px Georgia, serif'
    context.fillText('THE COLLECTOR’S', 512, 204)
    context.fillText('LITTLE WORLD', 512, 269)
    context.lineWidth = 3
    context.strokeStyle = '#c9aa72'
    context.beginPath()
    context.moveTo(220, 346)
    context.lineTo(804, 346)
    context.stroke()
    context.font = '500 172px "Microsoft YaHei", sans-serif'
    context.fillText('藏 境', 512, 623)
    context.font = '500 52px "Microsoft YaHei", sans-serif'
    context.fillText('把喜欢的生活收集起来', 512, 764)
    context.font = 'italic 110px Georgia, serif'
    context.fillText('Open', 512, 1084)
    context.font = '500 36px Georgia, serif'
    context.fillText('MAKE ROOM FOR JOY', 512, 1250)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <group>{[-1, 1].map(side => <mesh key={side} position={[0, 0.964, side * 0.06]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
    <planeGeometry args={[0.722, 1.083]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>)}</group>
}

export function DecorFurniture({ object }: { object: SceneObject }) {
  const factory = FACTORIES[object.kind as keyof typeof FACTORIES]
  const geometry = useMemo(() => factory?.() ?? {}, [factory])
  const materials = useMemo<Record<Finish, THREE.Material>>(() => ({
    body: new THREE.MeshStandardMaterial({ color: object.color, roughness: 0.63 }),
    wood: new THREE.MeshStandardMaterial({ color: object.kind === 'gallery-poster' ? object.color : '#ad855e', roughness: 0.61 }),
    brass: new THREE.MeshStandardMaterial({ color: '#bca06b', metalness: object.kind === 'reading-rug' ? 0 : 0.74, roughness: object.kind === 'reading-rug' ? 1 : 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#39433b', roughness: 0.67 }),
    cream: new THREE.MeshStandardMaterial({ color: '#e8dfcc', roughness: object.kind === 'reading-rug' ? 1 : 0.54 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f5efdf', roughness: 0.97 }),
    coral: new THREE.MeshStandardMaterial({ color: '#c7866c', roughness: 0.88 }),
    sage: new THREE.MeshStandardMaterial({ color: '#658377', roughness: 0.85 }),
    blue: new THREE.MeshStandardMaterial({ color: '#526977', roughness: 0.84 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#557153', roughness: 0.88 }),
    leafLight: new THREE.MeshStandardMaterial({ color: '#7e9669', roughness: 0.88 }),
    soil: new THREE.MeshStandardMaterial({ color: '#554335', roughness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#e0e9d9', transparent: true, opacity: 0.21, roughness: 0.56, metalness: 0.03, depthWrite: false, side: THREE.DoubleSide }),
  }), [object.color, object.kind])
  useEffect(() => () => Object.values(geometry).forEach(item => item?.dispose()), [geometry])
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials])
  return <group>
    {(Object.keys(geometry) as Finish[]).map(finish => <mesh key={finish} geometry={geometry[finish]} material={materials[finish]} castShadow={finish !== 'glass' && object.kind !== 'reading-rug'} receiveShadow={finish !== 'glass'} renderOrder={finish === 'glass' ? 2 : 0} dispose={null} />)}
    {object.kind === 'marquee-sign' && <SignFace />}
  </group>
}
