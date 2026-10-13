import type { AssetDefinition, AssetKind, Category, ModelAsset, Project, Room, SceneObject, TourStop, Vec3 } from './types'
import { createInitialProject, INITIAL_ROOM_NAMES } from './catalog'
import { CAPSULE_COLLECTION, DECOR_KITS, DECOR_MODELS, FLOOR_STYLES } from './decorCatalog'

// 'arm-model' is a legacy alias kept so older saves keep loading; it renders as the wrist display.
const KINDS: AssetKind[] = ['plinth', 'glass-case', 'shelf', 'bench', 'plant', 'lamp', 'sculpture', 'vase', 'arch', 'pedestal', 'easel', 'partition', 'stones', 'mobile', 'orrery', 'cat', 'rug', 'stanchion', 'figurine', 'kitten', 'puppy', 'bracelet', 'arm-model', 'bracelet-stand', 'teddy', 'bunny', 'gashapon', 'matryoshka', 'candy-jar', 'bead-tray', 'wrist-display', 'bracelet-steps', 'bracelet-jade', 'bracelet-amber', 'bracelet-crystal', 'bracelet-pearl', 'bracelet-obsidian', 'jewelry-counter', 'collector-cabinet', 'display-table', 'rubber-duck', 'toy-car', 'imported', 'decor-model', 'welcome-counter', 'marquee-sign', 'arched-screen', 'gallery-poster', 'planter-box', 'reading-rug']
KINDS.push('wayfinding-sign')
const CATEGORIES: Category[] = ['display', 'model', 'equipment']
const THEMES = ['ivory', 'sage', 'clay'] as const
export const MAX_ROOMS = 30
export const MAX_OBJECTS_PER_ROOM = 500
export const MAX_ASSETS = 300
export const MAX_MODEL_BYTES = 50 * 1024 * 1024
export const MIN_ROOM_SIZE = 4
export const MAX_ROOM_WIDTH = 120
export const MAX_ROOM_DEPTH = 100

function fail(path: string, message: string): never { throw new Error(`项目格式错误：${path}${message}`) }
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '必须是对象')
  return value as Record<string, unknown>
}
function text(value: unknown, path: string, max = 100, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail(path, `必须是${allowEmpty ? '不超过' : '1–'}${max}字的文本`)
  return value
}
function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path, `必须是${min}–${max}之间的有限数字`)
  return value
}
function bool(value: unknown, path: string): boolean { if (typeof value !== 'boolean') fail(path, '必须是布尔值'); return value }
function list(value: unknown, path: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, `数量必须在${min}–${max}之间`)
  return value
}
function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (!choices.includes(value as T)) fail(path, '不是支持的类型')
  return value as T
}
function vector(value: unknown, path: string, min: number, max: number): Vec3 {
  return list(value, path, 3, 3).map((n, i) => number(n, `${path}[${i}]`, min, max)) as Vec3
}
function uniqueId(value: unknown, path: string, ids: Set<string>): string {
  const id = text(value, path, 128)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) fail(path, '只支持字母、数字、下划线和连字符')
  if (ids.has(id)) fail(path, '不能重复')
  ids.add(id)
  return id
}

/** Validate the complete boundary and return fresh, whitelisted data. */
export function validateProject(value: unknown): Project {
  const root = record(value, '项目')
  if (root.version !== 1) fail('版本', '不受支持，请使用版本1的项目文件')
  const assetIds = new Set<string>()
  const roomIds = new Set<string>()
  const objectIds = new Set<string>()
  const assets: ModelAsset[] = list(root.assets, '模型库', MAX_ASSETS).map((value, index) => {
    const item = record(value, `模型${index + 1}`)
    const bytes = number(item.bytes, '模型大小', 1, MAX_MODEL_BYTES)
    if (!Number.isInteger(bytes)) fail('模型大小', '必须为整数')
    const createdAt = text(item.createdAt, '模型创建时间', 80)
    if (!Number.isFinite(Date.parse(createdAt))) fail('模型创建时间', '必须为有效日期')
    return { id: uniqueId(item.id, '模型ID', assetIds), name: text(item.name, '模型名称'), bytes, createdAt }
  })
  const rooms: Room[] = list(root.rooms, '房间', MAX_ROOMS, 1).map((value, index) => {
    const room = record(value, `房间${index + 1}`)
    const objects: SceneObject[] = list(room.objects, '房间物品', MAX_OBJECTS_PER_ROOM).map((value) => {
      const object = record(value, '物品')
      const kind = choice(object.kind, KINDS, '物品类型')
      const color = text(object.color, '物品颜色', 7)
      if (!/^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(color)) fail('物品颜色', '必须是十六进制颜色')
      const assetId = object.assetId === undefined ? undefined : text(object.assetId, '模型引用', 128)
      if (kind === 'imported' && !assetId) fail('导入模型', '缺少模型引用')
      if (assetId && !assetIds.has(assetId)) fail('模型引用', '指向不存在的模型')
      const decorId = object.decorId === undefined ? undefined : choice(object.decorId, DECOR_MODELS.map((item) => item.id), '装潢模型引用')
      if (kind === 'decor-model' && !decorId) fail('装潢模型', '缺少精选素材引用')
      if (decorId && kind !== 'decor-model') fail('装潢模型引用', '只适用于精选装潢模型')
      const collectibleId = object.collectibleId === undefined ? undefined : choice(object.collectibleId, CAPSULE_COLLECTION.map((item) => item.id), '收藏款式')
      if (collectibleId && CAPSULE_COLLECTION.find((item) => item.id === collectibleId)?.kind !== kind) fail('收藏款式', '与物品类型不符')
      const decorKitTag = object.decorKitTag === undefined ? undefined : choice(object.decorKitTag, DECOR_KITS.map((kit) => kit.id), '装潢套装')
      return { id: uniqueId(object.id, '物品ID', objectIds), name: text(object.name, '物品名称'), kind,
        category: choice(object.category, CATEGORIES, '物品分类'), color,
        position: vector(object.position, '物品位置', -100, 100), rotation: vector(object.rotation, '物品旋转', -1000, 1000),
        scale: vector(object.scale, '物品缩放', 0.05, 20), visible: bool(object.visible, '可见状态'), locked: bool(object.locked, '锁定状态'),
        ...(assetId ? { assetId } : {}),
        ...(decorId ? { decorId } : {}), ...(collectibleId ? { collectibleId } : {}), ...(decorKitTag ? { decorKitTag } : {}),
      }
    })
    const width = number(room.width, '房间宽度', MIN_ROOM_SIZE, MAX_ROOM_WIDTH)
    const depth = number(room.depth, '房间深度', MIN_ROOM_SIZE, MAX_ROOM_DEPTH)
    const tourIds = new Set<string>()
    const tour: TourStop[] | undefined = room.tour === undefined ? undefined : list(room.tour, '导览点', 12).map(value => {
      const stop = record(value, '导览点')
      const position = vector(stop.position, '导览位置', -100, 100)
      if (Math.abs(position[0]) > width / 2 - .28 || Math.abs(position[2]) > depth / 2 - .28) fail('导览位置', '必须位于房间内部并离墙至少0.28米')
      if (Math.abs(position[1] - 1.68) > .000001) fail('导览眼高', '必须为1.68米')
      return { id: uniqueId(stop.id, '导览ID', tourIds), title: text(stop.title, '导览标题', 80), description: text(stop.description, '导览说明', 240, true), position, yaw: number(stop.yaw, '导览朝向', -Math.PI * 2, Math.PI * 2) }
    })
    return { id: uniqueId(room.id, '房间ID', roomIds), name: text(room.name, '房间名称'), subtitle: text(room.subtitle, '房间说明', 240, true),
      theme: choice(room.theme, THEMES, '房间主题'), width, depth, objects,
      ...(room.floor === undefined ? {} : { floor: choice(room.floor, FLOOR_STYLES.map((floor) => floor.id), '房间地面') }), ...(tour === undefined ? {} : { tour }) }
  })
  const activeRoomId = text(root.activeRoomId, '当前房间ID', 128)
  if (!roomIds.has(activeRoomId)) fail('当前房间', '不存在')
  if (objectIds.size > 5000) fail('物品总数', '不得超过5000件')
  return { version: 1, name: text(root.name, '项目名称'), assets, rooms, activeRoomId }
}

export const createId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`
export type ObjectPatch = Partial<Omit<SceneObject, 'id' | 'kind' | 'category' | 'assetId' | 'decorId' | 'collectibleId' | 'decorKitTag'>>
export type RoomPatch = Partial<Pick<Room, 'name' | 'subtitle' | 'theme' | 'floor' | 'width' | 'depth'>>
export interface ProjectHistory { past: Project[]; present: Project; future: Project[] }
const clone = (project: Project): Project => structuredClone(project)

export function createHistory(project: Project): ProjectHistory {
  return { past: [], present: validateProject(project), future: [] }
}
export function commitHistory(history: ProjectHistory, project: Project): ProjectHistory {
  if (project === history.present || JSON.stringify(project) === JSON.stringify(history.present)) return history
  return { past: [...history.past, clone(history.present)].slice(-80), present: validateProject(project), future: [] }
}
export function undoHistory(history: ProjectHistory): ProjectHistory {
  const previous = history.past.at(-1)
  if (!previous) return history
  return { past: history.past.slice(0, -1), present: clone(previous), future: [clone(history.present), ...history.future] }
}
export function redoHistory(history: ProjectHistory): ProjectHistory {
  const next = history.future[0]
  if (!next) return history
  return { past: [...history.past, clone(history.present)], present: clone(next), future: history.future.slice(1) }
}
function changeRoom(project: Project, roomId: string, update: (room: Room) => Room): Project {
  if (!project.rooms.some((room) => room.id === roomId)) throw new Error('找不到房间')
  return { ...project, rooms: project.rooms.map((room) => room.id === roomId ? update(room) : room) }
}
export function updateProjectObject(project: Project, id: string, patch: ObjectPatch): Project {
  const source = project.rooms.find((room) => room.objects.some((object) => object.id === id))
  if (!source) return project
  const safePatch = structuredClone(patch)
  return changeRoom(project, source.id, (room) => ({ ...room, objects: room.objects.map((object) => object.id === id ? { ...object, ...safePatch } : object) }))
}
function findSpawnPosition(room: Room, size: Vec3): Vec3 {
  const candidates: Vec3[] = []
  const halfWidth = Math.max(0, room.width / 2 - size[0] / 2 - 0.25)
  const halfDepth = Math.max(0, room.depth / 2 - size[2] / 2 - 0.25)
  for (let x = -Math.floor(halfWidth / 1.5); x <= Math.floor(halfWidth / 1.5); x++) {
    for (let z = -Math.floor(halfDepth / 1.5); z <= Math.floor(halfDepth / 1.5); z++) candidates.push([x * 1.5, 0, z * 1.5])
  }
  candidates.sort((a, b) => Math.hypot(a[0], a[2]) - Math.hypot(b[0], b[2]))
  const separation = Math.max(1.4, Math.max(size[0], size[2]) * 0.65)
  const nearest = (position: Vec3) => Math.min(...room.objects.map((object) => Math.hypot(position[0] - object.position[0], position[2] - object.position[2])))
  const vacant = candidates.find((position) => nearest(position) >= separation)
  // Dense rooms remain editable; use the least crowded starting point when every grid cell is occupied.
  return vacant ?? candidates.sort((a, b) => nearest(b) - nearest(a))[0] ?? [0, 0, 0]
}
export function addProjectObject(project: Project, definition: AssetDefinition, id = createId('object')): Project {
  return changeRoom(project, project.activeRoomId, (room) => {
    if (room.objects.length >= MAX_OBJECTS_PER_ROOM) throw new Error(`每个房间最多放置${MAX_OBJECTS_PER_ROOM}件物品`)
    const object: SceneObject = { id, name: definition.name, kind: definition.kind, category: definition.category, color: definition.color,
      position: findSpawnPosition(room, definition.size), rotation: [0, 0, 0], scale: [1, 1, 1], visible: true, locked: false,
      ...(definition.assetId ? { assetId: definition.assetId } : {}), ...(definition.decorId ? { decorId: definition.decorId } : {}) }
    return { ...room, objects: [...room.objects, object] }
  })
}
export function removeProjectObject(project: Project, id: string): Project {
  const source = project.rooms.find((room) => room.objects.some((object) => object.id === id))
  if (!source) return project
  return changeRoom(project, source.id, (room) => ({ ...room, objects: room.objects.filter((object) => object.id !== id) }))
}
export function duplicateProjectObject(project: Project, id: string, copyId = createId('object')): Project {
  const source = project.rooms.find((room) => room.objects.some((object) => object.id === id))
  const original = source?.objects.find((object) => object.id === id)
  if (!source || !original) return project
  return changeRoom(project, source.id, (room) => {
    if (room.objects.length >= MAX_OBJECTS_PER_ROOM) throw new Error(`每个房间最多放置${MAX_OBJECTS_PER_ROOM}件物品`)
    const copy = structuredClone(original)
    copy.id = copyId
    copy.name = `${original.name.slice(0, 96)} 副本`
    copy.position[0] = Math.min(100, copy.position[0] + 0.65)
    copy.position[2] = Math.min(100, copy.position[2] + 0.65)
    copy.locked = false
    return { ...room, objects: [...room.objects, copy] }
  })
}
export function moveProjectObject(project: Project, id: string, targetRoomId: string): Project {
  const source = project.rooms.find((room) => room.objects.some((object) => object.id === id))
  const object = source?.objects.find((object) => object.id === id)
  if (!source || !object || source.id === targetRoomId) return project
  const target = project.rooms.find((room) => room.id === targetRoomId)
  if (!target) throw new Error('找不到目标房间')
  if (target.objects.length >= MAX_OBJECTS_PER_ROOM) throw new Error(`每个房间最多放置${MAX_OBJECTS_PER_ROOM}件物品`)
  return changeRoom(removeProjectObject(project, id), targetRoomId, (room) => ({ ...room, objects: [...room.objects, { ...structuredClone(object), position: [0, 0, 0] }] }))
}
export function addProjectRoom(project: Project, name: string, theme: Room['theme'], id = createId('room')): Project {
  if (project.rooms.length >= MAX_ROOMS) throw new Error(`最多创建${MAX_ROOMS}个房间`)
  return { ...project, activeRoomId: id, rooms: [...project.rooms, { id, name: name.trim() || '未命名房间', subtitle: '为新的灵感留一处空间', theme, width: 12, depth: 10, objects: [] }] }
}

/** Sync showcase rooms to the latest built-in layout: replace existing same-name rooms and append missing ones, with fresh ids. */
export function syncShowcaseRooms(project: Project): { project: Project; added: string[]; reset: string[] } {
  const names = new Set<string>(INITIAL_ROOM_NAMES)
  const kept = project.rooms.filter((room) => !names.has(room.name))
  const reset = project.rooms.filter((room) => names.has(room.name)).map((room) => room.name)
  const capacity = MAX_ROOMS - kept.length
  if (capacity <= 0) return { project, added: [], reset: [] }
  const fresh = createInitialProject().rooms.slice(0, capacity).map((room) => ({ ...structuredClone(room), id: createId('room'), objects: room.objects.map((object) => ({ ...structuredClone(object), id: createId('object') })) }))
  return { project: { ...project, activeRoomId: fresh[0]?.id ?? project.activeRoomId, rooms: [...kept, ...fresh] }, added: fresh.map((room) => room.name).filter((name) => !reset.includes(name)), reset }
}
export function updateProjectRoom(project: Project, id: string, patch: RoomPatch): Project {
  return changeRoom(project, id, room => {
    const next = { ...room, ...patch }
    if (room.tour && (patch.width !== undefined || patch.depth !== undefined)) {
      const bound = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
      next.tour = room.tour.map(stop => ({ ...stop, position: [bound(stop.position[0], next.width / 2 - .28), 1.68, bound(stop.position[2], next.depth / 2 - .28)] }))
    }
    return next
  })
}
export function removeProjectRoom(project: Project, id: string): Project {
  if (!project.rooms.some((room) => room.id === id)) return project
  if (project.rooms.length === 1) throw new Error('至少保留一个房间')
  const rooms = project.rooms.filter((room) => room.id !== id)
  return { ...project, rooms, activeRoomId: project.activeRoomId === id ? rooms[0].id : project.activeRoomId }
}

export const STORAGE_KEY = 'model-space.project.v1'
export interface StoredProject { project: Project; writable: boolean; error: string | null }
export function loadStoredProject(storage: Pick<Storage, 'getItem'>, fallback: () => Project): StoredProject {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return { project: raw === null ? fallback() : validateProject(JSON.parse(raw)), writable: true, error: null }
  } catch (error) {
    const reason = error instanceof Error ? error.message : '浏览器存储不可用'
    return { project: fallback(), writable: false, error: `存档未能读取，原存档已保留。当前修改仅保存在内存中，请导出项目备份。${reason}` }
  }
}
export function persistProject(storage: Pick<Storage, 'setItem'>, project: Project): string | null {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(project)); return null }
  catch { return '未能保存到浏览器，请导出项目备份，并检查浏览器存储权限或剩余空间。' }
}
