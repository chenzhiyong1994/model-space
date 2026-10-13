import type { Vec3 } from '../types'

export function roomView(width: number, depth: number, aspect: number) {
  const viewFit = Math.max(1, 1.2 / Math.max(aspect, 0.01))
  // Wall height stays fixed when the floor is resized, including a 4 × 4 room.
  const unit = Math.max(0.6, width / 12, depth / 10) * viewFit
  const maxDistance = Math.max(width, depth) * 3.5 * viewFit
  return {
    position: [10.7 * unit, 9.9 * unit, 13.2 * unit] as Vec3,
    target: [0, 0.7, 0] as Vec3,
    viewFit,
    maxDistance,
    // Include the far wall even when zoomed out to the orbit limit.
    far: Math.max(120, maxDistance + Math.hypot(width, depth) + 12),
  }
}
