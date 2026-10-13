import { describe, expect, it } from 'vitest'
import { addProjectObject, commitHistory, createHistory, undoHistory, updateProjectRoom, validateProject } from '../src/project'
import type { Project } from '../src/types'
import { applyDecorKit, drawProjectCapsule, getCapsuleCollection } from '../src/decor'
import { CATALOG } from '../src/catalog'
import { CAPSULE_COLLECTION } from '../src/decorCatalog'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as THREE from 'three'

// Build the real primitive geometry from the TSX source; this doesn't reuse catalogue dimensions.
function capsuleGeometry(kind: string): THREE.Object3D {
  const source = readFileSync(new URL('../src/scene/Objects.tsx', import.meta.url), 'utf8')
  const factories = source.slice(source.indexOf('function GooglyEyes('), source.indexOf('const GASHAPON_CAPSULES:'))
  const compiled = transformSync(`${factories}\nmodule.exports = { kitten: Kitten, puppy: Puppy, teddy: Teddy, bunny: Bunny, figurine: Figurine };`, {
    loader: 'tsx', format: 'cjs', jsx: 'transform', jsxFactory: 'geometryElement', jsxFragment: 'GeometryFragment',
  })
  const fragment = Symbol('geometry-fragment')
  const element = (type: string | symbol | ((props: Record<string, unknown>) => unknown), props: Record<string, unknown> | null, ...children: unknown[]): unknown => {
    props ??= {}
    if (typeof type === 'function') return type({ ...props, children })
    const items = children.flat(Infinity).filter(Boolean)
    if (type === fragment) { const group = new THREE.Group(); items.forEach(item => { if (item instanceof THREE.Object3D) group.add(item) }); return group }
    if (typeof type !== 'string') throw new Error('未知几何元素')
    if (type.endsWith('Geometry')) {
      const ctor = (THREE as unknown as Record<string, new (...args: unknown[]) => THREE.BufferGeometry>)[type[0].toUpperCase() + type.slice(1)]
      return new ctor(...(props.args as unknown[] ?? []))
    }
    if (type.endsWith('Material')) return null
    const node = type === 'mesh' ? new THREE.Mesh((props.geometry ?? items.find(item => item instanceof THREE.BufferGeometry)) as THREE.BufferGeometry) : new THREE.Group()
    if (Array.isArray(props.position)) node.position.fromArray(props.position)
    if (Array.isArray(props.rotation)) node.rotation.fromArray(props.rotation as [number, number, number])
    if (Array.isArray(props.scale)) node.scale.fromArray(props.scale)
    items.forEach(item => { if (item instanceof THREE.Object3D) node.add(item) })
    return node
  }
  const exports = { exports: {} as Record<string, (props: { color: string }) => THREE.Object3D> }
  new Function('THREE', 'useMemo', 'useEffect', 'geometryElement', 'GeometryFragment', 'module', compiled.code)(THREE, (factory: () => unknown) => factory(), () => {}, element, fragment, exports)
  return exports.exports[kind]({ color: '#c5aa85' })
}

const fixture = (): Project => ({
  version: 1, name: '收藏小铺', activeRoomId: 'room-a', assets: [],
  rooms: [{ id: 'room-a', name: '展厅', subtitle: '', theme: 'ivory', width: 12, depth: 10, objects: [] }],
})

describe('角落装潢套装', () => {
  it.each(['welcoming', 'reading', 'cozy', 'playful'])('套装%s保留全部原收藏，整体撤销且重复应用不堆叠', (kitId) => {
    const original = addProjectObject(fixture(), CATALOG.find((asset) => asset.kind === 'plinth')!, 'original-plinth')
    original.assets.push({ id: 'unused-asset', name: '保留模型', bytes: 128, createdAt: '2026-10-08T10:00:00Z' })
    original.rooms.push({ ...structuredClone(original.rooms[0]), id: 'room-b', objects: [] })
    const decorated = applyDecorKit(original, kitId)
    const added = decorated.rooms[0].objects.filter((object) => object.id !== 'original-plinth')
    expect(added.length).toBeGreaterThanOrEqual(5)
    expect(added.length).toBeLessThanOrEqual(7)
    expect(decorated.rooms[0].objects[0]).toEqual(original.rooms[0].objects[0])
    expect(decorated.rooms[1]).toEqual(original.rooms[1])
    expect(decorated.assets).toEqual(original.assets)
    expect(decorated.rooms[0]).toMatchObject({ width: 12, depth: 10 })
    expect(added.every((object) => object.decorKitTag === kitId)).toBe(true)
    expect(applyDecorKit(decorated, kitId)).toBe(decorated)
    expect(validateProject(JSON.parse(JSON.stringify(decorated)))).toEqual(decorated)
    const history = commitHistory(createHistory(original), decorated)
    expect(history.past).toHaveLength(1)
    expect(undoHistory(history).present).toEqual(original)
    expect(original.rooms[0]).not.toHaveProperty('floor')
    if (kitId === 'playful') {
      const machine = added.find((object) => object.kind === 'gashapon')!
      expect(drawProjectCapsule(decorated, machine.id, 0).collectible.id).toBe('moss-kitten')
    }
  })
  it('满房或没有空闲角落时清楚报错，不改变收藏与地面', () => {
    const original = fixture()
    original.rooms[0].width = 4
    original.rooms[0].depth = 4
    const full = addProjectObject(original, CATALOG.find((asset) => asset.kind === 'plinth')!, 'huge-plinth')
    full.rooms[0].objects[0].scale = [4, 4, 4]
    expect(() => applyDecorKit(full, 'welcoming')).toThrow('没有足够')
    expect(full.rooms[0]).not.toHaveProperty('floor')
    expect(full.rooms[0].objects).toHaveLength(1)
    const object = full.rooms[0].objects[0]
    full.rooms[0].objects = Array.from({ length: 498 }, (_, index) => ({ ...object, id: `full-${index}` }))
    expect(() => applyDecorKit(full, 'reading')).toThrow('最多放置500')
    expect(() => applyDecorKit(fixture(), 'unknown')).toThrow('装潢套装')
  })
})

describe('免费扭蛋收藏', () => {
  const withMachine = (): Project => addProjectObject(fixture(), CATALOG.find((asset) => asset.kind === 'gashapon')!, 'machine-a')
  it.each([
    [0, 'moss-kitten', '苔绿小猫'], [1 / 6, 'honey-puppy', '蜂蜜小狗'],
    [2 / 6, 'rose-bunny', '玫瑰小兔'], [3 / 6, 'cocoa-teddy', '可可小熊'],
    [4 / 6, 'sky-duck', '阳光小鸭'], [5 / 6, 'lilac-figurine', '丁香小精灵'],
  ])('转动一次产生一件可撤销、可恢复的独立珍藏：%s', (roll, id, name) => {
    const original = withMachine()
    const result = drawProjectCapsule(original, 'machine-a', Number(roll))
    expect(result.collectible).toMatchObject({ id, name })
    expect(original.rooms[0].objects).toHaveLength(1)
    expect(result.project.rooms[0].objects).toHaveLength(2)
    const item = result.project.rooms[0].objects.find((object) => object.id === result.itemId)!
    expect(item).toMatchObject({ name, collectibleId: id, visible: true, locked: false })
    expect(item.position).not.toEqual(original.rooms[0].objects[0].position)
    expect(getCapsuleCollection(result.project)).toEqual([id])
    const history = commitHistory(createHistory(original), result.project)
    expect(history.past).toHaveLength(1)
    expect(undoHistory(history).present).toEqual(original)
    expect(validateProject(JSON.parse(JSON.stringify(result.project)))).toEqual(result.project)
  })
  it('连续转动会错开已有珍藏，图鉴去重且不把旧玩偶算为扭蛋收藏', () => {
    let project = withMachine()
    for (let i = 0; i < 8; i++) project = drawProjectCapsule(project, 'machine-a', i % 2 ? 0.99 : 0).project
    const prizes = project.rooms[0].objects.filter((object) => object.collectibleId)
    expect(new Set(prizes.map((object) => object.position.join(','))).size).toBe(8)
    expect(getCapsuleCollection(project)).toEqual(['moss-kitten', 'lilac-figurine'])
    const legacy = addProjectObject(fixture(), CATALOG.find((asset) => asset.kind === 'kitten')!, 'old-kitten')
    expect(getCapsuleCollection(legacy)).toEqual([])
  })
  it('边缘的机器产生的珍藏完整留在房间内', () => {
    const original = withMachine()
    original.rooms[0].width = 4
    original.rooms[0].depth = 4
    original.rooms[0].objects[0].position = [1.7, 0, 1.7]
    const result = drawProjectCapsule(original, 'machine-a', 0.9)
    const item = result.project.rooms[0].objects[1]
    expect(Math.abs(item.position[0]) + result.collectible.size[0] / 2).toBeLessThanOrEqual(2)
    expect(Math.abs(item.position[2]) + result.collectible.size[2] / 2).toBeLessThanOrEqual(2)
  })
  it('非法机器、非法随机数和满房间均不会更改存档', () => {
    const original = withMachine()
    for (const roll of [-0.01, 1, NaN, Infinity]) expect(() => drawProjectCapsule(original, 'machine-a', roll)).toThrow('随机数')
    expect(() => drawProjectCapsule(original, 'missing', 0)).toThrow('扭蛋机')
    original.rooms[0].objects[0].kind = 'plinth'
    expect(() => drawProjectCapsule(original, 'machine-a', 0)).toThrow('扭蛋机')
    original.rooms[0].objects[0].kind = 'gashapon'
    const first = original.rooms[0].objects[0]
    original.rooms[0].objects = Array.from({ length: 500 }, (_, index) => ({ ...first, id: index ? `filler-${index}` : first.id }))
    expect(() => drawProjectCapsule(original, 'machine-a', 0)).toThrow('最多放置500')
    expect(original.rooms[0].objects).toHaveLength(500)
  })
  it('扭蛋机附近完全塞满时不覆盖原物品', () => {
    const original = withMachine()
    original.rooms[0].width = 4
    original.rooms[0].depth = 4
    const crowded = addProjectObject(original, CATALOG.find((asset) => asset.kind === 'plinth')!, 'blocker')
    crowded.rooms[0].objects[1].position = [0, 0, 0]
    crowded.rooms[0].objects[1].scale = [4, 4, 4]
    expect(() => drawProjectCapsule(crowded, 'machine-a', 0)).toThrow('周围没有可用位置')
    expect(crowded.rooms[0].objects).toHaveLength(2)
    expect(getCapsuleCollection(crowded)).toEqual([])
  })
  it('新奖品的占位包络覆盖真实几何，最长边不超过35厘米', () => {
    for (const collectible of CAPSULE_COLLECTION.filter((item) => item.kind !== 'rubber-duck')) {
      const geometry = capsuleGeometry(collectible.kind)
      geometry.scale.fromArray(collectible.scale)
      geometry.updateMatrixWorld(true)
      const actual = new THREE.Box3().setFromObject(geometry)
      expect(actual.min.x, collectible.id).toBeGreaterThanOrEqual(-collectible.size[0] / 2 - 0.00001)
      expect(actual.max.x, collectible.id).toBeLessThanOrEqual(collectible.size[0] / 2 + 0.00001)
      expect(actual.max.y, collectible.id).toBeLessThanOrEqual(collectible.size[1] + 0.00001)
      expect(actual.min.z, collectible.id).toBeGreaterThanOrEqual(-collectible.size[2] / 2 - 0.00001)
      expect(actual.max.z, collectible.id).toBeLessThanOrEqual(collectible.size[2] / 2 + 0.00001)
      expect(Math.max(...actual.getSize(new THREE.Vector3()).toArray()), collectible.id).toBeLessThanOrEqual(0.35)
    }
  })
})

describe('装潢存档契约', () => {
  it('地面编辑可撤销，恢复旧存档不加入额外字段', () => {
    const original = fixture()
    expect(validateProject(original)).toEqual(original)
    expect(validateProject(original).rooms[0]).not.toHaveProperty('floor')
    const history = commitHistory(createHistory(original), updateProjectRoom(original, 'room-a', { floor: 'oak' }))
    expect(history.present.rooms[0].floor).toBe('oak')
    expect(undoHistory(history).present).toEqual(original)
    expect(validateProject(JSON.parse(JSON.stringify(history.present)))).toEqual(history.present)
    expect(() => validateProject({ ...original, rooms: [{ ...original.rooms[0], floor: 'remote-texture' }] })).toThrow('房间地面')
  })
  it('精选装潢模型保存白名单引用并拒绝未知素材路径', () => {
    const definition = { id: 'decor-plant', name: '精致盆栽', subtitle: '', kind: 'decor-model' as const, category: 'equipment' as const,
      decorId: 'potted_plant_02', color: '#809172', size: [0.7, 1.2, 0.7] as [number, number, number] }
    const placed = addProjectObject(fixture(), definition, 'new-plant')
    expect(validateProject(placed).rooms[0].objects[0].decorId).toBe('potted_plant_02')
    for (const decorId of [undefined, '../../secret', 'missing-model']) {
      const changed = structuredClone(placed)
      changed.rooms[0].objects[0].decorId = decorId
      expect(() => validateProject(changed)).toThrow('装潢模型')
    }
    const spoofed = structuredClone(placed)
    spoofed.rooms[0].objects[0].kind = 'sculpture'
    expect(() => validateProject(spoofed)).toThrow('装潢模型')
  })
  it('恢复文件拒绝未知收藏与套装，收藏款式必须匹配几何', () => {
    const placed = addProjectObject(fixture(), CATALOG.find((asset) => asset.kind === 'kitten')!, 'my-kitten')
    expect(() => validateProject({ ...placed, rooms: [{ ...placed.rooms[0], objects: [{ ...placed.rooms[0].objects[0], collectibleId: 'unlisted-prize' }] }] })).toThrow('收藏款式')
    expect(() => validateProject({ ...placed, rooms: [{ ...placed.rooms[0], objects: [{ ...placed.rooms[0].objects[0], collectibleId: 'rose-bunny' }] }] })).toThrow('与物品类型不符')
    expect(() => validateProject({ ...placed, rooms: [{ ...placed.rooms[0], objects: [{ ...placed.rooms[0].objects[0], decorKitTag: 'unlisted-kit' }] }] })).toThrow('装潢套装')
  })
})
