import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { createDisplayHandGeometry, HAND_BRACELET_FIT, wristBeadCenters } from '../src/scene/handGeometry'

let source: THREE.Group
let geometry: THREE.BufferGeometry

beforeAll(async () => {
  const file = readFileSync(new URL('../public/models/anatomical-hand.glb', import.meta.url))
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  source = (await new GLTFLoader().parseAsync(bytes, '')).scene
  geometry = createDisplayHandGeometry(source)
})

describe('解剖手模和真实佩戴净空', () => {
  it('原手模与前臂焊接后是底部锚定的闭合网格，保留真实手指细节', () => {
    const position = geometry.getAttribute('position')
    const indices = geometry.getIndex()!
    expect(position.count).toBeGreaterThan(6000)
    expect(position.count).toBeLessThan(25000)
    expect([...position.array].every(Number.isFinite)).toBe(true)
    expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox!.min.y).toBe(0)
    expect(geometry.boundingBox!.max.y).toBeGreaterThan(0.38)
    expect(geometry.boundingBox!.max.y).toBeLessThan(0.42)
    const edgeCounts = new Map<string, number>()
    const aPoint = new THREE.Vector3()
    const bPoint = new THREE.Vector3()
    const cPoint = new THREE.Vector3()
    const cross = new THREE.Vector3()
    let volume = 0
    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      aPoint.fromBufferAttribute(position, indices.getX(triangle))
      bPoint.fromBufferAttribute(position, indices.getX(triangle + 1))
      cPoint.fromBufferAttribute(position, indices.getX(triangle + 2))
      volume += aPoint.dot(cross.crossVectors(bPoint, cPoint)) / 6
      for (let side = 0; side < 3; side++) {
        const a = indices.getX(triangle + side)
        const b = indices.getX(triangle + (side + 1) % 3)
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      }
    }
    expect(volume).toBeGreaterThan(0)
    expect([...edgeCounts.values()].every(count => count === 2)).toBe(true)
    expect(createDisplayHandGeometry(source)).toBe(geometry)
  })

  it('每颗珠子到实际三角网格均保留 1–3 mm 净空，邻珠无交叠', () => {
    const position = geometry.getAttribute('position')
    const indices = geometry.getIndex()!
    const triangle = new THREE.Triangle()
    const closest = new THREE.Vector3()
    const centers = wristBeadCenters()
    const { beadRadius } = HAND_BRACELET_FIT
    for (const center of centers) {
      let minimum = Infinity
      for (let i = 0; i < indices.count; i += 3) {
        triangle.a.fromBufferAttribute(position, indices.getX(i))
        triangle.b.fromBufferAttribute(position, indices.getX(i + 1))
        triangle.c.fromBufferAttribute(position, indices.getX(i + 2))
        triangle.closestPointToPoint(center, closest)
        minimum = Math.min(minimum, center.distanceTo(closest))
      }
      expect(minimum - beadRadius).toBeGreaterThanOrEqual(0.001)
      expect(minimum - beadRadius).toBeLessThanOrEqual(0.003)
    }
    for (let a = 0; a < centers.length; a++) {
      for (let b = a + 1; b < centers.length; b++) {
        expect(centers[a].distanceTo(centers[b])).toBeGreaterThan(beadRadius * 2)
      }
    }
  })
})
