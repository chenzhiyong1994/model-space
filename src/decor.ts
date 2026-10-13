import { CATALOG } from './catalog'
import { CAPSULE_COLLECTION, DECOR_BUILTINS, DECOR_KITS, DECOR_MODELS } from './decorCatalog'
import type { CapsuleCollectible } from './decorCatalog'
import { createId, MAX_OBJECTS_PER_ROOM } from './project'
import type { AssetDefinition, AssetKind, CollectibleId, DecorKitId, Project, Room, SceneObject, Vec3 } from './types'

interface Bounds { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
const isFloorCover = (object: SceneObject) => object.kind === 'rug' || object.kind === 'reading-rug'

function objectSize(object: SceneObject): Vec3 {
  const collectible = CAPSULE_COLLECTION.find((item) => item.id === object.collectibleId)
  if (collectible) return collectible.size.map((dimension, axis) => dimension / collectible.scale[axis] * object.scale[axis]) as Vec3
  const asset = object.kind === 'decor-model'
    ? DECOR_MODELS.find((model) => model.id === object.decorId)
    : CATALOG.find((definition) => definition.kind === object.kind)
  const size: Vec3 = asset?.size ?? [1.2, 1.2, 1.2]
  return size.map((dimension, axis) => dimension * object.scale[axis]) as Vec3
}
function bounds(position: Vec3, size: Vec3, rotation: Vec3 = [0, 0, 0]): Bounds {
  const [cx, cy, cz] = rotation.map(Math.cos), [sx, sy, sz] = rotation.map(Math.sin)
  const area: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }
  // Euler XYZ matches the scene object's transform, including exhibits tilted around the bottom anchor.
  for (const x of [-size[0] / 2, size[0] / 2]) for (const y of [0, size[1]]) for (const z of [-size[2] / 2, size[2] / 2]) {
    const rzX = x * cz - y * sz, rzY = x * sz + y * cz
    const ryX = rzX * cy + z * sy, ryZ = -rzX * sy + z * cy
    const px = position[0] + ryX, py = position[1] + rzY * cx - ryZ * sx, pz = position[2] + rzY * sx + ryZ * cx
    area.minX = Math.min(area.minX, px); area.maxX = Math.max(area.maxX, px)
    area.minY = Math.min(area.minY, py); area.maxY = Math.max(area.maxY, py)
    area.minZ = Math.min(area.minZ, pz); area.maxZ = Math.max(area.maxZ, pz)
  }
  return area
}
function overlaps(a: Bounds, b: Bounds, gap = 0.12): boolean {
  return a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap
    && a.minY < b.maxY - 0.005 && a.maxY > b.minY + 0.005
}
function inRoom(room: Room, area: Bounds): boolean {
  const margin = 0.15
  return area.minX >= -room.width / 2 + margin && area.maxX <= room.width / 2 - margin
    && area.minZ >= -room.depth / 2 + margin && area.maxZ <= room.depth / 2 - margin
}
function ensureCapacity(project: Project, room: Room, additional: number) {
  if (room.objects.length + additional > MAX_OBJECTS_PER_ROOM) throw new Error(`每个房间最多放置${MAX_OBJECTS_PER_ROOM}件物品，请先整理陈列`)
  if (project.rooms.reduce((count, current) => count + current.objects.length, 0) + additional > 5000) throw new Error('空间最多保存5000件物品，请先整理陈列')
}

export function getCapsuleCollection(project: Project): CollectibleId[] {
  const collected = new Set(project.rooms.flatMap((room) => room.objects.flatMap((object) => object.collectibleId ? [object.collectibleId] : [])))
  return CAPSULE_COLLECTION.filter((item) => collected.has(item.id)).map((item) => item.id)
}

export interface CapsuleDraw { project: Project; itemId: string; collectible: CapsuleCollectible }
export function drawProjectCapsule(project: Project, machineId: string, roll: number): CapsuleDraw {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('扭蛋随机数必须在0（包含）到1（不包含）之间')
  const room = project.rooms.find((candidate) => candidate.objects.some((object) => object.id === machineId))
  const machine = room?.objects.find((object) => object.id === machineId)
  if (!room || machine?.kind !== 'gashapon') throw new Error('请选择一台扭蛋机')
  ensureCapacity(project, room, 1)
  const collectible = CAPSULE_COLLECTION[Math.floor(roll * CAPSULE_COLLECTION.length)]
  const obstacles = room.objects.filter((object) => !isFloorCover(object)).map((object) => bounds(object.position, objectSize(object), object.rotation))
  let position: Vec3 | undefined
  // Start at the front of the machine, then fan out nearby; a crowded area fails without overwriting anything.
  for (let ring = 1; ring <= 7 && !position; ring++) {
    const radius = 0.42 * ring
    for (let step = 0; step < 16; step++) {
      const angle = machine.rotation[1] + Math.floor((step + 1) / 2) * (step % 2 ? 1 : -1) * Math.PI / 8
      const candidate: Vec3 = [machine.position[0] + Math.sin(angle) * radius, 0, machine.position[2] + Math.cos(angle) * radius]
      const area = bounds(candidate, collectible.size, [0, machine.rotation[1], 0])
      if (inRoom(room, area) && obstacles.every((obstacle) => !overlaps(area, obstacle))) { position = candidate; break }
    }
  }
  if (!position) throw new Error('扭蛋机周围没有可用位置，请挪开附近物品或把机器移到空处')
  const itemId = createId('capsule')
  const item: SceneObject = { id: itemId, name: collectible.name, kind: collectible.kind, category: 'model', color: collectible.color,
    collectibleId: collectible.id, position, rotation: [0, machine.rotation[1], 0], scale: [...collectible.scale], locked: false, visible: true }
  return { project: { ...project, rooms: project.rooms.map((current) => current.id === room.id ? { ...current, objects: [...current.objects, item] } : current) }, itemId, collectible }
}

function placed(definition: AssetDefinition, position: Vec3, scale = 1, yaw = 0): SceneObject {
  return { id: createId('decor'), name: definition.name, kind: definition.kind, category: definition.category, color: definition.color,
    position, rotation: [0, yaw, 0], scale: [scale, scale, scale], visible: true, locked: false,
    ...(definition.decorId ? { decorId: definition.decorId } : {}) }
}
function builtIn(kind: AssetKind, position: Vec3, scale = 1, yaw = 0): SceneObject {
  const definition = [...DECOR_BUILTINS, ...CATALOG].find((asset) => asset.kind === kind)
  if (!definition) throw new Error('装潢素材尚未准备好')
  return placed(definition, position, scale, yaw)
}
function decorModel(id: string, position: Vec3, scale = 1, yaw = 0): SceneObject {
  const model = DECOR_MODELS.find((asset) => asset.id === id)
  if (!model) throw new Error('装潢素材尚未准备好')
  return placed({ ...model, id: `decor-${model.id}`, decorId: id, kind: 'decor-model', category: 'equipment' }, position, scale, yaw)
}
function kitObjects(id: DecorKitId): SceneObject[] {
  switch (id) {
    case 'welcoming': return [
      builtIn('welcome-counter', [0, 0, 0]), builtIn('marquee-sign', [1.7, 0, 0]),
      builtIn('arched-screen', [-1.35, 0, -1.35]), builtIn('gallery-poster', [0.25, 0, -1.5]),
      decorModel('potted_plant_02', [1.35, 0, -1.1]), decorModel('ceramic_vase_03', [0.22, 1.08, -0.04]),
    ]
    case 'reading': return [
      builtIn('reading-rug', [0, 0, 0]), decorModel('mid_century_lounge_chair', [-0.85, 0.025, -0.2], 1, 0.2),
      decorModel('coffee_table_round_01', [0.65, 0.025, 0.4]), decorModel('potted_plant_02', [-1.85, 0, -0.7]),
      builtIn('gallery-poster', [0.65, 0, -1.55]), decorModel('ceramic_vase_01', [0.65, 0.51601, 0.4]),
    ]
    case 'cozy': return [
      builtIn('reading-rug', [1.35, 0, 0.3]), decorModel('CoffeeCart_01', [-1.05, 0, -0.8], 0.72),
      decorModel('modern_arm_chair_01', [0.65, 0.025, 0.8], 1, -0.3),
      decorModel('modern_coffee_table_01', [0.65, 0.025, -0.38], 1, Math.PI / 2),
      decorModel('vintage_oil_lamp', [0.87, 0.415, -0.38], 0.55), decorModel('potted_plant_04', [0.39, 0.415, -0.38]),
    ]
    case 'playful': return [
      builtIn('display-table', [0, 0, 0]), builtIn('gashapon', [-0.8, 0.86, 0], 1.35),
      builtIn('marquee-sign', [1.85, 0, 0]), builtIn('gallery-poster', [-1.65, 0, -1.35]),
      builtIn('planter-box', [0.05, 0, -1.1]), decorModel('brass_vase_03', [0.25, 0.86, -0.1], 1.25),
    ]
  }
}

/** Add one self-contained corner; never rearrange or remove existing collections. */
export function applyDecorKit(project: Project, kitId: string): Project {
  const kit = DECOR_KITS.find((candidate) => candidate.id === kitId)
  if (!kit) throw new Error('找不到这套装潢套装')
  const room = project.rooms.find((current) => current.id === project.activeRoomId)
  if (!room) throw new Error('找不到当前房间')
  if (room.objects.some((object) => object.decorKitTag === kit.id)) return project
  const objects = kitObjects(kit.id)
  ensureCapacity(project, room, objects.length)
  const obstacles = room.objects.filter((object) => !isFloorCover(object)).map((object) => bounds(object.position, objectSize(object), object.rotation))
  const envelopes = objects.map((object) => bounds(object.position, objectSize(object), object.rotation))
  const minX = Math.min(...envelopes.map((area) => area.minX)), maxX = Math.max(...envelopes.map((area) => area.maxX))
  const minZ = Math.min(...envelopes.map((area) => area.minZ)), maxZ = Math.max(...envelopes.map((area) => area.maxZ))
  const candidates: Vec3[] = []
  const left = -room.width / 2 + 0.22 - minX, right = room.width / 2 - 0.22 - maxX
  const back = -room.depth / 2 + 0.22 - minZ, front = room.depth / 2 - 0.22 - maxZ
  // Prefer the entrance corners and room perimeter, leaving the centre for displays and circulation.
  if (left <= right && back <= front) {
    candidates.push([left, 0, front], [right, 0, front], [left, 0, back], [right, 0, back])
    for (let z = front; z >= back; z -= 0.5) candidates.push([left, 0, z], [right, 0, z])
    for (let x = left; x <= right; x += 0.5) candidates.push([x, 0, front], [x, 0, back])
  }
  let added: SceneObject[] | undefined
  for (const offset of candidates) {
    const proposed = objects.map((object) => ({ ...object, decorKitTag: kit.id, position: [object.position[0] + offset[0], object.position[1], object.position[2] + offset[2]] as Vec3 }))
    const vacant = proposed.every((object) => {
      const area = bounds(object.position, objectSize(object), object.rotation)
      if (!inRoom(room, area)) return false
      // The rug belongs underneath this cluster but must not spill under existing exhibits.
      return obstacles.every((obstacle) => !overlaps({ ...area, minY: 0, maxY: Math.max(area.maxY, 2.5) }, obstacle, isFloorCover(object) ? 0.03 : 0.18))
    })
    if (vacant) { added = proposed; break }
  }
  if (!added) throw new Error('房间没有足够的空闲角落放下整套装潢，请先整理物品、扩建房间，或单件自由布置')
  return { ...project, rooms: project.rooms.map((current) => current.id === room.id ? { ...current, floor: kit.floor, objects: [...current.objects, ...added] } : current) }
}
