import type { AssetKind } from '../types'

export type GemStyle = 'wood' | 'jade' | 'amber' | 'crystal' | 'pearl' | 'obsidian'
export const JEWELRY_STYLES: Record<string, GemStyle> = {
  bracelet: 'wood', 'bracelet-jade': 'jade', 'bracelet-amber': 'amber',
  'bracelet-crystal': 'crystal', 'bracelet-pearl': 'pearl', 'bracelet-obsidian': 'obsidian',
}
export const isBracelet = (kind: AssetKind) => kind in JEWELRY_STYLES

/** Equal arc-length positions, so beads around an elliptical wrist never bunch at its tips. */
export function ellipseBeads(radiusX: number, radiusZ: number, count: number) {
  const samples = 2048
  const arc = [0]
  for (let i = 1; i <= samples; i++) {
    const a = (i - 1) / samples * Math.PI * 2
    const b = i / samples * Math.PI * 2
    arc.push(arc[i - 1] + Math.hypot(radiusX * (Math.cos(b) - Math.cos(a)), radiusZ * (Math.sin(b) - Math.sin(a))))
  }
  let cursor = 1
  return Array.from({ length: count }, (_, index) => {
    const target = index / count * arc[samples]
    while (arc[cursor] < target) cursor++
    const part = (target - arc[cursor - 1]) / (arc[cursor] - arc[cursor - 1])
    const angle = (cursor - 1 + part) / samples * Math.PI * 2
    return { x: Math.cos(angle) * radiusX, z: Math.sin(angle) * radiusZ, angle }
  })
}
