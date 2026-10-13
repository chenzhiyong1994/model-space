import * as THREE from 'three'
import { ellipseBeads } from './jewelryLayout'
import { publicAsset } from '../publicAsset'

/** The source hand is CC0; provenance and checksum live in docs/asset-sources.md. */
export const ANATOMICAL_HAND_URL = publicAsset('models/anatomical-hand.glb')

/** Metres, Y up, palm facing +Z. The forearm's bottom is at local Y = 0. */
export const HAND_BRACELET_FIT = {
  center: [0, 0.188, 0] as [number, number, number],
  radiusX: 0.0375,
  radiusZ: 0.0275,
  beadRadius: 0.0055,
  beadCount: 16,
  skinRadiusX: 0.030,
  skinRadiusZ: 0.020,
} as const

const WRIST_JOIN_Y = 0.235
const SOURCE_CUT_Y = 0.005
const FIT_ZONE_BOTTOM = 0.169
const PALM_BLEND_HEIGHT = 0.035
const cache = new WeakMap<THREE.Object3D, THREE.BufferGeometry>()

const smooth = (value: number) => value * value * (3 - 2 * value)

/** Exact, constant elliptical sleeve around the bracelet, wider toward the base. */
export function forearmRadiiAt(y: number): [number, number] {
  const t = smooth(THREE.MathUtils.clamp((FIT_ZONE_BOTTOM - y) / FIT_ZONE_BOTTOM, 0, 1))
  return [HAND_BRACELET_FIT.skinRadiusX + t * 0.012, HAND_BRACELET_FIT.skinRadiusZ + t * 0.009]
}

/** Equal arc-length placement avoids overlapping beads at the short ellipse ends. */
export function wristBeadCenters(): THREE.Vector3[] {
  const { radiusX, radiusZ, beadCount, center } = HAND_BRACELET_FIT
  return ellipseBeads(radiusX, radiusZ, beadCount).map(point => new THREE.Vector3(center[0] + point.x, center[1], center[2] + point.z))
}

/**
 * Bake the source's relaxed skeletal pose, then replace its wrist cap with a
 * continuous forearm. The exact cut loop is shared by both surfaces, so the
 * result has no intersecting primitives or visible wrist/palm seam.
 * A source scene is processed once and its immutable geometry is reused.
 */
export function createDisplayHandGeometry(source: THREE.Object3D): THREE.BufferGeometry {
  const cached = cache.get(source)
  if (cached) return cached
  source.updateMatrixWorld(true)
  const wrist = source.getObjectByName('hand_r')
  let mesh: THREE.SkinnedMesh | undefined
  source.traverse(object => { if (object instanceof THREE.SkinnedMesh) mesh = object })
  if (!wrist || !mesh) throw new Error('内置解剖手模缺少手腕骨骼或蒙皮网格。')
  mesh.skeleton.update()

  // Anatomical axes are derived in the wrist bone's space, independent of the
  // source file's mirrored armature and exporter-specific root transforms.
  const inverseWrist = wrist.matrixWorld.clone().invert()
  const origin = new THREE.Vector3(-0.004, 0.018, 0.002)
  const landmark = (name: string) => {
    const bone = source.getObjectByName(name)
    if (!bone) throw new Error(`内置解剖手模缺少 ${name}。`)
    return bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseWrist)
  }
  const axisY = landmark('middle_01_r').sub(origin).normalize()
  const axisX = landmark('index_01_r').sub(landmark('pinky_01_r'))
  axisX.addScaledVector(axisY, -axisX.dot(axisY)).normalize()
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize()
  const input = Array.from({ length: mesh.geometry.getAttribute('position').count }, (_, index) => {
    const point = mesh!.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(mesh!.matrixWorld).applyMatrix4(inverseWrist).sub(origin)
    return new THREE.Vector3(point.dot(axisX), point.dot(axisY), point.dot(axisZ))
  })

  const positions: THREE.Vector3[] = []
  const indices: number[] = []
  const welded = new Map<string, number>()
  const vertex = (point: THREE.Vector3) => {
    const key = point.toArray().map(value => Math.round(value * 1e6)).join(':')
    const existing = welded.get(key)
    if (existing !== undefined) return existing
    const index = positions.length
    positions.push(point)
    welded.set(key, index)
    return index
  }
  const sourceIndex = mesh.geometry.getIndex()
  if (!sourceIndex) throw new Error('内置解剖手模缺少三角形索引。')
  for (let i = 0; i < sourceIndex.count; i += 3) {
    const triangle = [input[sourceIndex.getX(i)], input[sourceIndex.getX(i + 1)], input[sourceIndex.getX(i + 2)]]
    const clipped: THREE.Vector3[] = []
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge]
      const b = triangle[(edge + 1) % 3]
      const aInside = a.y >= SOURCE_CUT_Y
      const bInside = b.y >= SOURCE_CUT_Y
      if (aInside) clipped.push(a.clone())
      if (aInside !== bInside) {
        const point = a.clone().lerp(b, (SOURCE_CUT_Y - a.y) / (b.y - a.y))
        point.y = SOURCE_CUT_Y
        clipped.push(point)
      }
    }
    for (let j = 1; j + 1 < clipped.length; j++) {
      const ids = [vertex(clipped[0]), vertex(clipped[j]), vertex(clipped[j + 1])]
      if (new Set(ids).size === 3) indices.push(...ids)
    }
  }

  // Recover the directed cut boundary from actual topology instead of sorting
  // angles; this preserves all original surface triangles at the join.
  const edges = new Map<string, { count: number; a: number; b: number }>()
  for (let i = 0; i < indices.length; i += 3) {
    for (let side = 0; side < 3; side++) {
      const a = indices[i + side]
      const b = indices[i + (side + 1) % 3]
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      const previous = edges.get(key)
      if (previous) previous.count++
      else edges.set(key, { count: 1, a, b })
    }
  }
  const boundary = [...edges.values()].filter(edge => edge.count === 1)
  if (boundary.length < 12 || boundary.some(edge => Math.abs(positions[edge.a].y - SOURCE_CUT_Y) > 1e-5)) {
    throw new Error('手腕截面不完整，无法生成连续前臂。')
  }
  const next = new Map(boundary.map(edge => [edge.a, edge.b]))
  const loop = [boundary[0].a]
  while (loop.length < boundary.length) {
    const following = next.get(loop[loop.length - 1])
    if (following === undefined || loop.includes(following)) throw new Error('手腕截面不是单一闭合环。')
    loop.push(following)
  }
  if (next.get(loop[loop.length - 1]) !== loop[0]) throw new Error('手腕截面未闭合。')

  const cutBox = new THREE.Box3().setFromPoints(loop.map(index => positions[index]))
  const cutCenter = cutBox.getCenter(new THREE.Vector3())
  for (const point of positions) {
    point.set(point.x - cutCenter.x, point.y - SOURCE_CUT_Y + WRIST_JOIN_Y, point.z - cutCenter.z)
    // The supplied hand ends in a rounded cap. Re-form its lowest 35 mm into
    // the same wrist ellipse, restoring the untouched palm with a smooth blend.
    // Simply extruding that cap's rim would leave a visible crease/highlight.
    const blend = smooth(THREE.MathUtils.clamp((point.y - WRIST_JOIN_Y) / PALM_BLEND_HEIGHT, 0, 1))
    const angle = Math.atan2(point.z / HAND_BRACELET_FIT.skinRadiusZ, point.x / HAND_BRACELET_FIT.skinRadiusX)
    point.x = THREE.MathUtils.lerp(HAND_BRACELET_FIT.skinRadiusX * Math.cos(angle), point.x, blend)
    point.z = THREE.MathUtils.lerp(HAND_BRACELET_FIT.skinRadiusZ * Math.sin(angle), point.z, blend)
  }
  const joinPoints = loop.map(index => positions[index].clone())
  const angles = joinPoints.map(point => Math.atan2(point.z / HAND_BRACELET_FIT.skinRadiusZ, point.x / HAND_BRACELET_FIT.skinRadiusX))
  let upper = loop
  const rings = 48
  for (let ring = 1; ring <= rings; ring++) {
    const y = WRIST_JOIN_Y * (1 - ring / rings)
    const [rx, rz] = forearmRadiiAt(y)
    const lower = joinPoints.map((_, index) => {
      const point = new THREE.Vector3(rx * Math.cos(angles[index]), y, rz * Math.sin(angles[index]))
      positions.push(point)
      return positions.length - 1
    })
    for (let i = 0; i < loop.length; i++) {
      const j = (i + 1) % loop.length
      indices.push(upper[j], upper[i], lower[i], upper[j], lower[i], lower[j])
    }
    upper = lower
  }
  const bottom = positions.length
  positions.push(new THREE.Vector3(0, 0, 0))
  for (let i = 0; i < loop.length; i++) indices.push(upper[(i + 1) % loop.length], upper[i], bottom)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flatMap(point => point.toArray()), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  // The cut loop retains the source's irregular angular spacing. Analytical
  // normals keep the smooth forearm smooth even beside very narrow triangles.
  const normals = geometry.getAttribute('normal')
  for (let i = 0; i < positions.length; i++) {
    const point = positions[i]
    if (point.y > WRIST_JOIN_Y || i === bottom) continue
    const [rx, rz] = forearmRadiiAt(point.y)
    const t = THREE.MathUtils.clamp((FIT_ZONE_BOTTOM - point.y) / FIT_ZONE_BOTTOM, 0, 1)
    const derivative = -6 * t * (1 - t) / FIT_ZONE_BOTTOM
    const normal = new THREE.Vector3(point.x / (rx * rx), -(point.x ** 2) * 0.012 * derivative / rx ** 3 - point.z ** 2 * 0.009 * derivative / rz ** 3, point.z / (rz * rz)).normalize()
    normals.setXYZ(i, normal.x, normal.y, normal.z)
  }
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  cache.set(source, geometry)
  return geometry
}
