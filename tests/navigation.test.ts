import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { roomView } from '../src/scene/roomView'

function roomCorners(width: number, depth: number) {
  return [-width / 2, width / 2].flatMap(x => [0, 3.4].flatMap(y => [-depth / 2, depth / 2].map(z => new THREE.Vector3(x, y, z))))
}

describe('房间扩建后的全景和缩放', () => {
  it.each([
    [12, 10, 1.6], [120, 100, 1.6], [120, 100, 0.65],
    [120, 4, 1.6], [4, 100, 1.6], [4, 4, 1.6],
  ])('%s × %s 米房间在宽高比 %s 的全景中完整显示地面与墙顶', (width, depth, aspect) => {
    const view = roomView(width, depth, aspect)
    const camera = new THREE.PerspectiveCamera(43, aspect, 0.05, view.far)
    camera.position.fromArray(view.position)
    camera.lookAt(new THREE.Vector3(...view.target))
    camera.updateMatrixWorld()
    for (const corner of roomCorners(width, depth)) {
      const projected = corner.project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(1)
      expect(Math.abs(projected.y)).toBeLessThan(1)
      expect(projected.z).toBeGreaterThan(-1)
      expect(projected.z).toBeLessThan(1)
    }
  })

  it('120 × 100 米展厅缩小到最远轨道距离后仍不被远裁剪面切断', () => {
    const view = roomView(120, 100, 1.6)
    const camera = new THREE.PerspectiveCamera(43, 1.6, 0.05, view.far)
    const target = new THREE.Vector3(...view.target)
    camera.position.fromArray(view.position).sub(target).setLength(view.maxDistance).add(target)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    expect(roomCorners(120, 100).every(corner => corner.project(camera).z < 1)).toBe(true)
  })
})
