import type { Vec3 } from '../types'

export const WALK_EYE_HEIGHT = 1.68
export const WALK_RADIUS = .24
export interface WalkObstacle { minX: number; maxX: number; minZ: number; maxZ: number }
interface Bounds3 { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }

/** A conservative floor footprint, derived from rendered world bounds. */
export function walkObstacle(box: Bounds3): WalkObstacle | null {
  const values = [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
  if (!values.every(Number.isFinite) || box.max.y < .12 || box.min.y > WALK_EYE_HEIGHT || box.max.x < box.min.x || box.max.z < box.min.z) return null
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }
}

export function walkPositionBlocked(x: number, z: number, obstacles: WalkObstacle[], radius = WALK_RADIUS): boolean {
  return obstacles.some(box => x > box.minX - radius && x < box.maxX + radius && z > box.minZ - radius && z < box.maxZ + radius)
}

/** Small swept steps keep sprinting from tunnelling; independent axes allow sliding. */
export function moveWalkPosition(position: Vec3, delta: Vec3, room: { width: number; depth: number }, obstacles: WalkObstacle[], radius = WALK_RADIUS): Vec3 {
  const dx = Number.isFinite(delta[0]) ? delta[0] : 0
  const dz = Number.isFinite(delta[2]) ? delta[2] : 0
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / .06))
  const limitX = Math.max(0, room.width / 2 - radius)
  const limitZ = Math.max(0, room.depth / 2 - radius)
  const bound = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
  let x = bound(position[0], limitX), z = bound(position[2], limitZ)
  for (let step = 0; step < steps; step++) {
    const nextX = bound(x + dx / steps, limitX)
    if (!walkPositionBlocked(nextX, z, obstacles, radius)) x = nextX
    const nextZ = bound(z + dz / steps, limitZ)
    if (!walkPositionBlocked(x, nextZ, obstacles, radius)) z = nextZ
  }
  return [x, WALK_EYE_HEIGHT, z]
}

/** Tour stops remain usable if later edits occupy their original footprint. */
export function findWalkLanding(position: Vec3, room: { width: number; depth: number }, obstacles: WalkObstacle[]): Vec3 | null {
  const safe = (x: number, z: number) => Math.abs(x) <= room.width / 2 - .28 && Math.abs(z) <= room.depth / 2 - .28 && !walkPositionBlocked(x, z, obstacles)
  if (safe(position[0], position[2])) return [position[0], WALK_EYE_HEIGHT, position[2]]
  for (let distance = .4; distance <= Math.max(room.width, room.depth); distance += .4) {
    const samples = Math.max(12, Math.ceil(distance * Math.PI * 2 / .4))
    for (let i = 0; i < samples; i++) {
      const angle = i / samples * Math.PI * 2
      const x = position[0] + Math.cos(angle) * distance, z = position[2] + Math.sin(angle) * distance
      if (safe(x, z)) return [x, WALK_EYE_HEIGHT, z]
    }
  }
  return null
}
