import { describe, expect, it } from 'vitest'
import { addProjectObject, addProjectRoom, commitHistory, createHistory, duplicateProjectObject, loadStoredProject, moveProjectObject, persistProject, redoHistory, removeProjectObject, removeProjectRoom, STORAGE_KEY, syncShowcaseRooms, undoHistory, updateProjectObject, updateProjectRoom, validateProject } from '../src/project'
import { CATALOG, createInitialProject } from '../src/catalog'
import type { Project } from '../src/types'

const fixture = (): Project => ({
  version: 1, name: '我的展厅', activeRoomId: 'room-a', assets: [],
  rooms: [{ id: 'room-a', name: '主展厅', subtitle: '作品', theme: 'ivory', width: 12, depth: 10,
    objects: [{ id: 'object-a', name: '雕塑', kind: 'sculpture', category: 'model', color: '#eb7548',
      position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true, locked: false }] }],
})

describe('房间与摆放操作', () => {
  it('连续添加会错开已有物体，复制和删除只影响目标物体', () => {
    const asset = CATALOG.find((item) => item.kind === 'plinth')!
    let project = addProjectObject(fixture(), asset, 'added-a')
    project = addProjectObject(project, asset, 'added-b')
    const positions = project.rooms[0].objects.map((item) => item.position)
    expect(new Set(positions.map((position) => position.join(','))).size).toBe(3)
    project = duplicateProjectObject(project, 'added-a', 'copied-a')
    expect(project.rooms[0].objects.find((item) => item.id === 'copied-a')?.name).toBe('方形展台 副本')
    project = removeProjectObject(project, 'added-a')
    expect(project.rooms[0].objects.map((item) => item.id)).toEqual(['object-a', 'added-b', 'copied-a'])
  })
  it('新增房间、跨房间移动，删除活动房间会返回剩余房间', () => {
    const initial = fixture()
    const expanded = addProjectRoom(initial, '形态实验室', 'sage', 'room-b')
    expect(expanded.activeRoomId).toBe('room-b')
    const moved = moveProjectObject(expanded, 'object-a', 'room-b')
    expect(moved.rooms[0].objects).toHaveLength(0)
    expect(moved.rooms[1].objects[0].name).toBe('雕塑')
    expect(initial.rooms[0].objects).toHaveLength(1)
    const removed = removeProjectRoom(moved, 'room-b')
    expect(removed.rooms).toHaveLength(1)
    expect(removed.activeRoomId).toBe('room-a')
  })
  it('同步示例展厅会重置同名展厅、补齐缺失并分配全新ID', () => {
    const result = syncShowcaseRooms(fixture())
    expect(result.reset).toEqual([])
    expect(result.added).toEqual(['造物展厅', '形态实验室', '灵感储藏室', '萌物收藏馆', '串珠工坊'])
    expect(result.project.rooms).toHaveLength(6)
    expect(result.project.activeRoomId).toBe(result.project.rooms[1].id)
    const ids = result.project.rooms.flatMap((room) => [room.id, ...room.objects.map((object) => object.id)])
    expect(new Set(ids).size).toBe(ids.length)
    expect(() => validateProject(result.project)).not.toThrow()
    const again = syncShowcaseRooms(result.project)
    expect(again.added).toEqual([])
    expect(again.reset).toEqual(['造物展厅', '形态实验室', '灵感储藏室', '萌物收藏馆', '串珠工坊'])
    expect(again.project.rooms).toHaveLength(6)
    const renamed = { ...again.project, rooms: again.project.rooms.map((room) => room.name === '串珠工坊' ? { ...room, name: '串珠小铺' } : room) }
    const third = syncShowcaseRooms(renamed)
    expect(third.reset).toEqual(['造物展厅', '形态实验室', '灵感储藏室', '萌物收藏馆'])
    expect(third.added).toEqual(['串珠工坊'])
    expect(third.project.rooms.some((room) => room.name === '串珠小铺')).toBe(true)
  })
  it('最后一个房间不能删除', () => {
    expect(() => removeProjectRoom(fixture(), 'room-a')).toThrow('至少保留一个房间')
  })
  it('一次变换可以撤销、重做，新操作清空重做分支', () => {
    const start = fixture()
    let history = createHistory(start)
    const patch = { position: [2, 1.05, -1] as [number, number, number] }
    history = commitHistory(history, updateProjectObject(history.present, 'object-a', patch))
    patch.position[0] = 99
    expect(history.present.rooms[0].objects[0].position).toEqual([2, 1.05, -1])
    history = undoHistory(history)
    expect(history.present.rooms[0].objects[0].position).toEqual([0, 0, 0])
    history = redoHistory(history)
    expect(history.present.rooms[0].objects[0].position).toEqual([2, 1.05, -1])
    history = undoHistory(history)
    history = commitHistory(history, updateProjectObject(history.present, 'object-a', { name: '新雕塑' }))
    expect(history.future).toHaveLength(0)
    expect(start.rooms[0].objects[0].name).toBe('雕塑')
  })
  it('完整项目恢复作为一个操作，撤销可找回恢复前的所有房间', () => {
    const original = createInitialProject()
    const restored = commitHistory(createHistory(original), fixture())
    expect(restored.present.rooms).toHaveLength(1)
    expect(undoHistory(restored).present).toEqual(original)
    expect(redoHistory(undoHistory(restored)).present).toEqual(fixture())
  })
  it('展厅可扩建到120×100米，撤销、重做和重新读取存档保留尺寸与原有摆放', () => {
    const original = fixture()
    const expanded = commitHistory(createHistory(original), updateProjectRoom(original, 'room-a', { width: 120, depth: 100 }))
    expect(expanded.present.rooms[0]).toMatchObject({ width: 120, depth: 100, objects: original.rooms[0].objects })
    expect(expanded.past).toHaveLength(1)
    expect(undoHistory(expanded).present).toEqual(original)
    expect(redoHistory(undoHistory(expanded)).present).toEqual(expanded.present)
    let saved = ''
    const storage = { setItem: (_: string, value: string) => { saved = value }, getItem: () => saved }
    expect(persistProject(storage, expanded.present)).toBeNull()
    expect(loadStoredProject(storage, fixture).project).toEqual(expanded.present)
  })
  it('缩小展厅只改变边界，墙外物体仍保留且可撤销找回原尺寸', () => {
    const original = fixture()
    original.rooms[0].objects[0].position = [5, 1.2, 4]
    const smaller = commitHistory(createHistory(original), updateProjectRoom(original, 'room-a', { width: 4, depth: 4 }))
    expect(smaller.present.rooms[0]).toMatchObject({ width: 4, depth: 4, objects: original.rooms[0].objects })
    expect(undoHistory(smaller).present).toEqual(original)
  })
  it.each([
    ['width', 3.99], ['width', 120.01], ['width', NaN], ['width', Infinity],
    ['depth', 3.99], ['depth', 100.01], ['depth', NaN], ['depth', -Infinity],
  ] as const)('尺寸 %s=%s 不会写入操作历史', (dimension, value) => {
    const original = fixture()
    const history = createHistory(original)
    expect(() => commitHistory(history, updateProjectRoom(history.present, 'room-a', { [dimension]: value }))).toThrow('有限数字')
    expect(history.present).toEqual(original)
    expect(history.past).toHaveLength(0)
  })
})

describe('项目文件边界', () => {
  it('接纳有效项目并隔离输入引用', () => {
    const input = fixture()
    const parsed = validateProject(input)
    parsed.rooms[0].objects[0].position[0] = 8
    expect(input.rooms[0].objects[0].position).toEqual([0, 0, 0])
    expect(parsed.activeRoomId).toBe('room-a')
  })
  it.each([
    ['非有限变换', (p: Project) => { p.rooms[0].objects[0].position[0] = Infinity }],
    ['重复物品ID', (p: Project) => { p.rooms[0].objects.push({ ...p.rooms[0].objects[0] }) }],
    ['缺失当前房间', (p: Project) => { p.activeRoomId = 'missing' }],
    ['悬空模型引用', (p: Project) => { p.rooms[0].objects[0].assetId = 'missing' }],
    ['负缩放', (p: Project) => { p.rooms[0].objects[0].scale[0] = -1 }],
    ['空房间列表', (p: Project) => { p.rooms = [] }],
    ['超大房间', (p: Project) => { p.rooms[0].width = 50000 }],
  ] as const)('拒绝%s', (_, mutate) => {
    const input = fixture()
    mutate(input)
    expect(() => validateProject(input)).toThrow()
  })
})

describe('本地存档', () => {
  it('新空间的五个房间可以通过完整校验', () => {
    const project = validateProject(createInitialProject())
    expect(project.rooms.map((room) => room.name)).toEqual(['造物展厅', '形态实验室', '灵感储藏室', '萌物收藏馆', '串珠工坊'])
  })
  it('每件内置素材有唯一标识，实际放置后完整保留模型引用并通过校验', () => {
    const base = createInitialProject()
    expect(new Set(CATALOG.map(asset => asset.id)).size).toBe(CATALOG.length)
    for (const asset of CATALOG) {
      const empty = { ...base, rooms: [{ ...base.rooms[0], objects: [] }] }
      const placed = validateProject(addProjectObject(empty, asset, `probe-${asset.id}`)).rooms[0].objects[0]
      expect(placed).toMatchObject({ name: asset.name, kind: asset.kind, category: asset.category })
      if (asset.decorId) expect(placed.decorId).toBe(asset.decorId)
    }
  })
  it('损坏存档保留原文并禁止自动覆盖', () => {
    let raw = '{ broken'
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
    const loaded = loadStoredProject(storage, fixture)
    expect(loaded.writable).toBe(false)
    expect(loaded.error).toContain('原存档已保留')
    expect(raw).toBe('{ broken')
    expect(loaded.project.rooms[0].id).toBe('room-a')
  })
  it('保存与恢复所有摆放数据，捕获配额和读取失败', () => {
    const memory = new Map<string, string>()
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value) } }
    expect(persistProject(storage, fixture())).toBeNull()
    expect(memory.has(STORAGE_KEY)).toBe(true)
    expect(loadStoredProject(storage, createInitialProject).project).toEqual(fixture())
    expect(persistProject({ setItem: () => { throw new Error('QuotaExceeded') } }, fixture())).toContain('未能保存')
    const failed = loadStoredProject({ getItem: () => { throw new Error('blocked') } }, fixture)
    expect(failed.writable).toBe(false)
    expect(failed.error).toContain('原存档已保留')
  })
})
