export async function validateGlb(file: Blob): Promise<void> {
  if (file.size === 0) throw new Error('模型文件为空，请重新选择 GLB 文件。')
  if (file.size > 50 * 1024 * 1024) throw new Error('模型超过 50 MB，请压缩后再导入。')
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength < 12 || new DataView(bytes).getUint32(0, true) !== 0x46546c67) {
    throw new Error('文件内容不是有效的 GLB 模型，请导出 GLB 2.0 格式。')
  }
  const view = new DataView(bytes)
  if (view.getUint32(4, true) !== 2) throw new Error('目前仅支持 GLB 2.0，请重新导出模型。')
  if (view.getUint32(8, true) !== bytes.byteLength) throw new Error('GLB 文件长度不完整，文件可能已损坏。')
  let offset = 12
  let chunkIndex = 0
  let hasJson = false
  let hasBinary = false
  let document: unknown
  let binaryLength = 0
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) throw new Error('GLB 数据块头部不完整。')
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    if (length % 4 !== 0 || offset + 8 + length > bytes.byteLength) {
      throw new Error('GLB 数据块长度或对齐无效，文件可能已损坏。')
    }
    if (chunkIndex === 0 && type !== 0x4e4f534a) throw new Error('GLB 首个数据块必须是 JSON。')
    if (type === 0x4e4f534a) {
      if (hasJson) throw new Error('GLB 包含重复的 JSON 数据块。')
      hasJson = true
      try {
        document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes, offset + 8, length)))
      } catch {
        throw new Error('GLB 的 JSON 内容损坏，无法读取模型结构。')
      }
    }
    if (type === 0x004e4942) {
      if (hasBinary || chunkIndex !== 1) throw new Error('GLB 二进制数据块顺序无效。')
      hasBinary = true
      binaryLength = length
    }
    offset += 8 + length
    chunkIndex++
  }
  if (!hasJson) throw new Error('GLB 缺少 JSON 数据块。')
  validateDocument(document, binaryLength)
}

type JsonObject = Record<string, unknown>

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`模型${label}结构无效。`)
  return value as JsonObject
}

function entries(value: unknown, label: string, required = false): JsonObject[] {
  if (value === undefined && !required) return []
  if (!Array.isArray(value) || (required && value.length === 0)) throw new Error(`模型${label}列表为空或无效。`)
  return value.map(item => object(item, label))
}

function integer(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
}

function index(value: unknown, length: number, label: string): number {
  if (!integer(value) || value >= length) throw new Error(`模型${label}引用不存在。`)
  return value
}

function embeddedUri(uri: unknown, label: string): void {
  if (typeof uri !== 'string' || !/^data:[^,]*,/i.test(uri)) {
    throw new Error(`模型包含外部${label}资源，请导出包含所有纹理和几何数据的 GLB。`)
  }
}

function validateDocument(value: unknown, binaryLength: number): void {
  const document = object(value, 'JSON')
  if (object(document.asset, '版本').version !== '2.0') throw new Error('模型 JSON 必须声明 glTF 2.0 版本。')
  const scenes = entries(document.scenes, '场景', true)
  const nodes = entries(document.nodes, '节点', true)
  const meshes = entries(document.meshes, '网格', true)
  const buffers = entries(document.buffers, '缓冲区')
  const views = entries(document.bufferViews, '缓冲视图')
  const accessors = entries(document.accessors, '顶点数据')
  const images = entries(document.images, '纹理')
  const sceneIndex = index(document.scene ?? 0, scenes.length, '默认场景')

  buffers.forEach((buffer, bufferIndex) => {
    if (!integer(buffer.byteLength, 1)) throw new Error('模型缓冲区长度无效。')
    if (buffer.uri !== undefined) embeddedUri(buffer.uri, '二进制')
    else if (bufferIndex !== 0 || binaryLength < buffer.byteLength || binaryLength > buffer.byteLength + 3) {
      throw new Error('模型内嵌缓冲区长度与 GLB 二进制数据不一致。')
    }
  })
  views.forEach(view => {
    const buffer = buffers[index(view.buffer, buffers.length, '缓冲区')]
    const offset = view.byteOffset ?? 0
    if (!integer(offset) || !integer(view.byteLength, 1) || offset + view.byteLength > (buffer.byteLength as number)) {
      throw new Error('模型缓冲视图超出二进制数据范围。')
    }
  })
  accessors.forEach(accessor => {
    if (!integer(accessor.count, 1) || ![5120, 5121, 5122, 5123, 5125, 5126].includes(accessor.componentType as number) ||
      !['SCALAR', 'VEC2', 'VEC3', 'VEC4', 'MAT2', 'MAT3', 'MAT4'].includes(accessor.type as string)) {
      throw new Error('模型顶点数据格式无效。')
    }
    if (accessor.bufferView !== undefined) index(accessor.bufferView, views.length, '顶点缓冲视图')
  })
  images.forEach(image => {
    if (image.uri !== undefined) embeddedUri(image.uri, '纹理')
    else {
      index(image.bufferView, views.length, '纹理缓冲视图')
      if (typeof image.mimeType !== 'string' || !image.mimeType.startsWith('image/')) throw new Error('内嵌纹理缺少有效的图片类型。')
    }
  })
  meshes.forEach(mesh => {
    entries(mesh.primitives, '网格图元', true).forEach(primitive => {
      const attributes = object(primitive.attributes, '顶点属性')
      index(attributes.POSITION, accessors.length, '顶点位置')
      Object.values(attributes).forEach(attribute => index(attribute, accessors.length, '顶点属性'))
      if (primitive.indices !== undefined) index(primitive.indices, accessors.length, '顶点索引')
    })
  })
  const children = nodes.map(node => {
    if (node.mesh !== undefined) index(node.mesh, meshes.length, '网格')
    if (node.children === undefined) return []
    if (!Array.isArray(node.children)) throw new Error('模型子节点列表无效。')
    return node.children.map(child => index(child, nodes.length, '子节点'))
  })
  // Iterative DFS keeps malformed or deeply nested files from overflowing the call stack.
  const visited = new Uint8Array(nodes.length)
  for (let start = 0; start < nodes.length; start++) {
    const stack: [number, boolean][] = [[start, false]]
    while (stack.length) {
      const [current, leaving] = stack.pop()!
      if (leaving) { visited[current] = 2; continue }
      if (visited[current] === 1) throw new Error('模型节点包含循环引用，无法展示。')
      if (visited[current] === 2) continue
      visited[current] = 1
      stack.push([current, true])
      for (const child of children[current]) stack.push([child, false])
    }
  }
  const roots = scenes.map(scene => {
    if (scene.nodes === undefined) return []
    if (!Array.isArray(scene.nodes)) throw new Error('模型场景节点列表无效。')
    return scene.nodes.map(node => index(node, nodes.length, '场景节点'))
  })
  let hasVisibleMesh = false
  const pending = [...roots[sceneIndex]]
  const seen = new Set<number>()
  while (pending.length) {
    const current = pending.pop()!
    if (seen.has(current)) continue
    seen.add(current)
    if (nodes[current].mesh !== undefined) hasVisibleMesh = true
    pending.push(...children[current])
  }
  if (!hasVisibleMesh) throw new Error('模型默认场景中没有可展示的网格。')
}

const DATABASE_NAME = 'model-space-assets'
const STORE_NAME = 'models'

function storageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error('浏览器本地存储空间不足，请清理不需要的素材或使用更小的模型。')
  }
  const detail = error instanceof Error ? `（${error.message}）` : ''
  return new Error(`无法读写本地模型库，请检查浏览器的存储权限${detail}。`)
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持本地模型库，请使用支持 IndexedDB 的浏览器。'))
      return
    }
    let request: IDBOpenDBRequest
    try { request = indexedDB.open(DATABASE_NAME, 1) } catch (error) { reject(storageError(error)); return }
    let cancelled = false
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onerror = () => { cancelled = true; reject(storageError(request.error)) }
    request.onblocked = () => {
      cancelled = true
      reject(new Error('本地模型库被其他页面占用，请关闭其他展示空间页面后重试。'))
    }
    request.onsuccess = () => {
      if (cancelled) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

async function transaction<T>(mode: IDBTransactionMode, perform: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    let current: IDBTransaction
    let request: IDBRequest<T>
    try {
      current = database.transaction(STORE_NAME, mode)
      request = perform(current.objectStore(STORE_NAME))
    } catch (error) {
      database.close()
      reject(storageError(error))
      return
    }
    let result: T
    request.onsuccess = () => { result = request.result }
    // A successful request can still be followed by a transaction abort (for example quota errors).
    current.oncomplete = () => { database.close(); resolve(result) }
    current.onabort = () => { database.close(); reject(storageError(current.error ?? request.error)) }
    current.onerror = () => { /* The abort handler reports the final transaction failure. */ }
  })
}

export async function storeAsset(id: string, blob: Blob): Promise<void> {
  if (!id) throw new Error('保存模型时缺少素材编号。')
  await transaction('readwrite', store => store.put(blob, id))
}

export async function getAsset(id: string): Promise<Blob | undefined> {
  const value: unknown = await transaction('readonly', store => store.get(id))
  if (value === undefined) return undefined
  if (!(value instanceof Blob)) throw new Error('本地模型数据损坏，请重新导入该素材。')
  return value
}

export async function deleteAsset(id: string): Promise<void> {
  await transaction('readwrite', store => store.delete(id))
}

/** The caller owns every returned object URL and must revoke it when no longer in use. */
export async function loadAssetUrls(ids: string[]): Promise<{ urls: Record<string, string>; missing: string[] }> {
  const assets = await Promise.all([...new Set(ids)].map(async id => ({ id, blob: await getAsset(id) })))
  const urls: Record<string, string> = Object.create(null)
  const missing: string[] = []
  try {
    for (const { id, blob } of assets) {
      if (blob === undefined) missing.push(id)
      else urls[id] = URL.createObjectURL(blob)
    }
  } catch (error) {
    Object.values(urls).forEach(url => URL.revokeObjectURL(url))
    throw new Error(`无法加载本地模型：${error instanceof Error ? error.message : '浏览器无法创建素材地址'}。`)
  }
  return { urls, missing }
}
