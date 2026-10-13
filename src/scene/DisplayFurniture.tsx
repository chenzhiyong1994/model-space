import { Suspense, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { publicAsset } from '../publicAsset'

type Vec3 = [number, number, number]
type Finish = 'wood' | 'inset' | 'dark' | 'brass' | 'velvet' | 'back' | 'light' | 'glass'
type BoxPart = { finish: Finish; position: Vec3; size: Vec3 }
type FurnitureGeometry = Partial<Record<Finish, THREE.BufferGeometry>>

/** Local metres, measured from the furniture's bottom anchor. +Z is the front. */
export const DISPLAY_FURNITURE_SURFACES = {
  'jewelry-counter': {
    size: [2.4, 1.4, 1] as Vec3,
    top: 0.92,
    usableX: [-1.15, 1.15],
    usableZ: [-0.44, 0.44],
    clearance: 0.44,
  },
  'collector-cabinet': {
    size: [2.6, 2.4, 0.72] as Vec3,
    shelves: [0.3, 0.8, 1.3, 1.8],
    columnCenters: [-0.84, 0, 0.84],
    cellWidth: 0.79,
    usableZ: [-0.29, 0.31],
    clearances: [0.43, 0.43, 0.43, 0.49],
  },
  'display-table': {
    size: [2.4, 0.86, 1.2] as Vec3,
    top: 0.86,
    usableX: [-1.12, 1.12],
    usableZ: [-0.52, 0.52],
    lowerShelf: 0.25,
    lowerUsableX: [-0.95, 0.95],
    lowerUsableZ: [-0.37, 0.37],
    lowerClearance: 0.45,
  },
} as const

function box(finish: Finish, position: Vec3, size: Vec3): BoxPart {
  return { finish, position, size }
}

// Merge all solid pieces of one finish. Every instance shares these static meshes,
// so extra joinery, grooves and handles do not add one draw call per detail.
function buildGeometry(parts: BoxPart[]): FurnitureGeometry {
  const batches: Partial<Record<Finish, THREE.BufferGeometry[]>> = {}
  for (const part of parts) {
    const geometry = new THREE.BoxGeometry(...part.size)
    geometry.translate(...part.position)
    if (part.finish === 'wood' || part.finish === 'inset') {
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      const uv = geometry.getAttribute('uv')
      for (let index = 0; index < position.count; index++) {
        const faceNormal = [normal.getX(index), normal.getY(index), normal.getZ(index)]
        const axes = [0, 1, 2].filter(axis => Math.abs(faceNormal[axis]) < 0.5)
        const grainAxis = part.size[axes[0]] > part.size[axes[1]] ? axes[0] : axes[1]
        const crossAxis = axes.find(axis => axis !== grainAxis)!
        const point = [position.getX(index), position.getY(index), position.getZ(index)]
        // The source grain runs along V. Keep its scale consistent in metres,
        // aligned with the longest edge of each visible board face.
        uv.setXY(index, point[crossAxis] * 1.4, point[grainAxis] * 1.4)
      }
    }
    ;(batches[part.finish] ??= []).push(geometry)
  }
  const result: FurnitureGeometry = {}
  for (const finish of Object.keys(batches) as Finish[]) {
    const geometries = batches[finish]!
    result[finish] = mergeGeometries(geometries, false)!
    result[finish]!.computeBoundingSphere()
    geometries.forEach(geometry => geometry.dispose())
  }
  return result
}

function pull(x: number, y: number, z: number, width = 0.2): BoxPart[] {
  return [
    box('brass', [x, y, z], [width, 0.012, 0.012]),
    ...[-width * 0.4, width * 0.4].map(dx => box('brass', [x + dx, y, z - 0.01], [0.012, 0.012, 0.02])),
  ]
}

const COUNTER_GEOMETRY = buildGeometry([
  box('dark', [0, 0.045, 0], [2.22, 0.09, 0.84]),
  box('brass', [0, 0.095, 0], [2.25, 0.01, 0.87]),
  box('wood', [0, 0.47, 0], [2.34, 0.74, 0.9]),
  box('dark', [0, 0.854, 0], [2.38, 0.028, 0.98]),
  box('wood', [0, 0.889, 0], [2.4, 0.042, 1]),
  box('velvet', [0, 0.912, 0], [2.32, 0.016, 0.92]),
  ...[-1.183, 1.183].map(x => box('brass', [x, 0.912, 0], [0.034, 0.016, 1])),
  ...[-0.483, 0.483].map(z => box('brass', [0, 0.912, z], [2.332, 0.016, 0.034])),
  ...[-0.578, 0.578].flatMap(x => [
    box('inset', [x, 0.355, 0.46], [1.12, 0.42, 0.024]),
    box('inset', [x, 0.705, 0.46], [1.12, 0.24, 0.024]),
    ...pull(x, 0.712, 0.49),
    ...Array.from({ length: 13 }, (_, index) => box('wood', [x - 0.51 + index * 0.085, 0.355, 0.474], [0.025, 0.386, 0.006])),
  ]),
  // The glass is a thin shell, not a solid translucent block around the pieces.
  ...[-1.188, 1.188].flatMap(x => [-0.488, 0.488].map(z => box('brass', [x, 1.148, z], [0.018, 0.456, 0.018]))),
  ...[-1.181, 1.181].map(x => box('glass', [x, 1.146, 0], [0.006, 0.44, 0.962])),
  ...[-0.481, 0.481].map(z => box('glass', [0, 1.146, z], [2.356, 0.44, 0.006])),
  box('glass', [0, 1.374, 0], [2.36, 0.008, 0.96]),
  ...[-1.188, 1.188].map(x => box('brass', [x, 1.384, 0], [0.024, 0.032, 1])),
  ...[-0.488, 0.488].map(z => box('brass', [0, 1.384, z], [2.352, 0.032, 0.024])),
  box('light', [0, 1.367, -0.458], [2.27, 0.004, 0.008]),
  box('brass', [0, 0.744, -0.456], [0.25, 0.052, 0.008]),
  box('dark', [0, 0.744, -0.461], [0.202, 0.002, 0.002]),
])

const CABINET_GEOMETRY = buildGeometry([
  box('dark', [0, 0.055, 0], [2.4, 0.11, 0.59]),
  box('brass', [0, 0.116, 0], [2.44, 0.012, 0.62]),
  box('wood', [0, 0.191, 0], [2.6, 0.138, 0.72]),
  box('back', [0, 1.3, -0.338], [2.47, 2.08, 0.044]),
  ...[-1.2675, 1.2675].map(x => box('wood', [x, 1.3, 0], [0.065, 2.08, 0.72])),
  box('wood', [0, 2.37, 0], [2.6, 0.06, 0.72]),
  box('brass', [0, 2.337, 0.351], [2.47, 0.012, 0.012]),
  ...DISPLAY_FURNITURE_SURFACES['collector-cabinet'].shelves.flatMap(y => [
    box('wood', [0, y - 0.025, 0], [2.47, 0.05, 0.68]),
    box('brass', [0, y - 0.012, 0.345], [2.47, 0.014, 0.012]),
  ]),
  ...[-0.42, 0.42].map(x => box('wood', [x, 1.32, -0.004], [0.024, 2.04, 0.632])),
  ...[-1.243, 1.243].map(x => box('brass', [x, 1.315, 0.354], [0.014, 2.05, 0.012])),
  ...[0.737, 1.237, 1.737, 2.318].flatMap(y => DISPLAY_FURNITURE_SURFACES['collector-cabinet'].columnCenters.map(x =>
    box('light', [x, y, 0.247], [0.72, 0.006, 0.012]),
  )),
  ...DISPLAY_FURNITURE_SURFACES['collector-cabinet'].columnCenters.flatMap(x => [
    box('inset', [x, 0.196, 0.348], [0.8, 0.098, 0.012]),
    box('brass', [x, 0.196, 0.357], [0.125, 0.008, 0.006]),
    // A narrow inset panel outlines each bay without filling its usable volume.
    ...[-0.359, 0.359].map(dx => box('inset', [x + dx, 1.32, -0.312], [0.01, 1.93, 0.008])),
  ]),
])

const TABLE_GEOMETRY = buildGeometry([
  ...[-1.035, 1.035].flatMap(x => [-0.435, 0.435].flatMap(z => [
    box('brass', [x, 0.025, z], [0.073, 0.05, 0.073]),
    box('wood', [x, 0.414, z], [0.068, 0.728, 0.068]),
  ])),
  ...[-0.478, 0.478].map(z => box('wood', [0, 0.747, z], [2.15, 0.086, 0.036])),
  ...[-1.059, 1.059].map(x => box('wood', [x, 0.747, 0], [0.032, 0.086, 0.92])),
  box('wood', [0, 0.225, 0], [2.14, 0.05, 0.88]),
  box('brass', [0, 0.219, 0.445], [2.14, 0.01, 0.01]),
  box('wood', [0, 0.8175, 0], [2.4, 0.065, 1.2]),
  box('brass', [0, 0.788, 0], [2.38, 0.006, 1.18]),
  box('velvet', [0, 0.855, 0], [2.24, 0.01, 1.04]),
  ...[-1.127, 1.127].map(x => box('brass', [x, 0.855, 0], [0.01, 0.01, 1.064])),
  ...[-0.527, 0.527].map(z => box('brass', [0, 0.855, z], [2.244, 0.01, 0.01])),
  ...[-0.545, 0.545].flatMap(x => [
    box('inset', [x, 0.742, 0.505], [1.02, 0.064, 0.03]),
    ...pull(x, 0.742, 0.539, 0.145),
  ]),
])

function Furniture({ color, geometry, woodMap }: { color: string; geometry: FurnitureGeometry; woodMap?: THREE.Texture }) {
  const materials = useMemo<Record<Finish, THREE.Material>>(() => ({
    wood: new THREE.MeshStandardMaterial({ color, map: woodMap ?? null, roughness: 0.48 }),
    inset: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), map: woodMap ?? null, roughness: 0.64 }),
    dark: new THREE.MeshStandardMaterial({ color: '#383d37', roughness: 0.68 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b49a65', roughness: 0.3, metalness: 0.75 }),
    velvet: new THREE.MeshStandardMaterial({ color: '#ddd4bf', roughness: 1 }),
    back: new THREE.MeshStandardMaterial({ color: '#e6e1d6', roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ color: '#fff4da', emissive: '#ffe6ad', emissiveIntensity: 0.7, roughness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#e1f1ea', transparent: true, opacity: 0.095, roughness: 0.08, metalness: 0.04, depthWrite: false, side: THREE.DoubleSide }),
  }), [color, woodMap])
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials])
  return <group>{(Object.keys(geometry) as Finish[]).map(finish => <mesh
    key={finish}
    geometry={geometry[finish]}
    material={materials[finish]}
    castShadow={finish !== 'glass' && finish !== 'light'}
    receiveShadow={finish !== 'glass' && finish !== 'light'}
    renderOrder={finish === 'glass' ? 2 : 0}
    dispose={null}
  />)}</group>
}

function TexturedFurniture({ color, geometry }: { color: string; geometry: FurnitureGeometry }) {
  const source = useTexture(publicAsset('textures/wood-table-001-diffuse.jpg'))
  const woodMap = useMemo(() => {
    const texture = source.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 4
    texture.needsUpdate = true
    return texture
  }, [source])
  useEffect(() => () => woodMap.dispose(), [woodMap])
  return <Furniture color={color} geometry={geometry} woodMap={woodMap} />
}

function FurnitureWithTexture({ color, geometry }: { color: string; geometry: FurnitureGeometry }) {
  return <Suspense fallback={<Furniture color={color} geometry={geometry} />}>
    <TexturedFurniture color={color} geometry={geometry} />
  </Suspense>
}

export function JewelryCounter({ color }: { color: string }) {
  return <FurnitureWithTexture color={color} geometry={COUNTER_GEOMETRY} />
}

export function CollectorCabinet({ color }: { color: string }) {
  return <FurnitureWithTexture color={color} geometry={CABINET_GEOMETRY} />
}

export function DisplayTable({ color }: { color: string }) {
  return <FurnitureWithTexture color={color} geometry={TABLE_GEOMETRY} />
}
