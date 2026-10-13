import { describe, expect, it } from 'vitest'
import { findWalkLanding, moveWalkPosition, walkObstacle, walkPositionBlocked } from '../src/scene/walkNavigation'
import { createInitialProject } from '../src/catalog'
import { updateProjectRoom, validateProject } from '../src/project'

describe('展厅漫游的真实障碍与导览存档', () => {
  it('加速经过薄展板时停在展板之前，不能穿透', () => {
    const result = moveWalkPosition([-2, 1.68, 0], [5, 0, 0], { width: 12, depth: 10 }, [{ minX: 0, maxX: .05, minZ: -1, maxZ: 1 }])
    expect(result[0]).toBeLessThanOrEqual(-.24)
    expect(result[0]).toBeGreaterThan(-.31)
    expect(result[2]).toBe(0)
  })
  it('斜向碰到展柜后仍可沿展柜边缘移动', () => {
    const result = moveWalkPosition([-.6, 1.68, -1], [1.5, 0, 1.5], { width: 12, depth: 10 }, [{ minX: 0, maxX: 1, minZ: -2, maxZ: 2 }])
    expect(result[0]).toBeLessThanOrEqual(-.24)
    expect(result[2]).toBeCloseTo(.5)
  })
  it('到达房间边缘后沿墙滑动，眼高保持 1.68 米', () => {
    const result = moveWalkPosition([5.6, 8, 0], [3, -4, 2], { width: 12, depth: 10 }, [])
    expect(result[0]).toBe(5.76)
    expect(result[1]).toBe(1.68)
    expect(result[2]).toBeCloseTo(2, 10)
  })
  it('真实几何中地毯与头顶装饰可通过，矮柜需要绕行', () => {
    expect(walkObstacle({ min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: .025, z: 1 } })).toBeNull()
    expect(walkObstacle({ min: { x: -1, y: 2, z: -1 }, max: { x: 1, y: 3, z: 1 } })).toBeNull()
    expect(walkObstacle({ min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: .8, z: 1 } })).toEqual({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 })
  })
  it('导览点后被物体占用时能落在邻近空位，整馆被堵也可明确失败', () => {
    const obstacles = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }]
    const landing = findWalkLanding([0, 1.68, 0], { width: 12, depth: 10 }, obstacles)
    expect(landing).not.toBeNull()
    expect(walkPositionBlocked(landing![0], landing![2], obstacles)).toBe(false)
    expect(Math.hypot(landing![0], landing![2])).toBeLessThan(1.7)
    expect(findWalkLanding([0, 1.68, 0], { width: 4, depth: 4 }, [{ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }])).toBeNull()
  })
  it('旧版本房间读取后不添加默认导览字段', () => {
    const original = createInitialProject()
    expect(validateProject(original)).toEqual(original)
    expect(validateProject(original).rooms.every(room => !('tour' in room))).toBe(true)
  })
  it('导览点保存后保留文字、观察方向与位置，并剔除未允许的属性', () => {
    const project = createInitialProject()
    Object.assign(project.rooms[0], { tour: [{ id: 'entrance', title: '第一眼', description: '从收藏岛开始', position: [0, 1.68, 3], yaw: Math.PI / 2, externalUrl: 'https://invalid.test' }] })
    expect(validateProject(project).rooms[0].tour).toEqual([{ id: 'entrance', title: '第一眼', description: '从收藏岛开始', position: [0, 1.68, 3], yaw: Math.PI / 2 }])
  })
  it.each([
    { position: [0, 0, 0] }, { position: [7, 1.68, 0] }, { yaw: Infinity }, { yaw: 9 },
  ])('拒绝不安全导览位置或朝向 %j', patch => {
    const project = createInitialProject()
    Object.assign(project.rooms[0], { tour: [{ id: 'entrance', title: '入口', description: '', position: [0, 1.68, 3], yaw: 0, ...patch }] })
    expect(() => validateProject(project)).toThrow(/导览/)
  })
  it('同馆导览点不能重名 ID 或超过 12 个', () => {
    const project = createInitialProject()
    const stop = { id: 'entrance', title: '入口', description: '', position: [0, 1.68, 3], yaw: 0 }
    Object.assign(project.rooms[0], { tour: [stop, stop] })
    expect(() => validateProject(project)).toThrow(/导览/)
    Object.assign(project.rooms[0], { tour: Array.from({ length: 13 }, (_, i) => ({ ...stop, id: `stop-${i}` })) })
    expect(() => validateProject(project)).toThrow(/导览/)
  })
  it('缩小房间时把导览点保留在新墙内，物体摆放保持不变', () => {
    const project = createInitialProject()
    Object.assign(project.rooms[0], { tour: [{ id: 'entrance', title: '入口', description: '', position: [5, 1.68, 4], yaw: 0 }] })
    const resized = updateProjectRoom(project, project.rooms[0].id, { width: 4, depth: 4 })
    expect(validateProject(resized).rooms[0].tour?.[0].position).toEqual([1.72, 1.68, 1.72])
    expect(resized.rooms[0].objects).toEqual(project.rooms[0].objects)
    expect(project.rooms[0].tour?.[0].position).toEqual([5, 1.68, 4])
  })
})
