import { describe, expect, it } from 'vitest'
import { validateGlb } from '../src/assets'

const triangle = () => ({
  asset: { version: '2.0', generator: 'Model Space original triangle fixture' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, 0, 0], max: [1, 2, 0] }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
  buffers: [{ byteLength: 36 }],
})

function glb(document: unknown = triangle(), mutate?: (view: DataView) => void) {
  const json = new TextEncoder().encode(JSON.stringify(document))
  const jsonLength = Math.ceil(json.length / 4) * 4
  const bytes = new ArrayBuffer(12 + 8 + jsonLength + 8 + 36)
  const view = new DataView(bytes)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.byteLength, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(bytes, 20, jsonLength).fill(0x20)
  new Uint8Array(bytes, 20, json.length).set(json)
  view.setUint32(20 + jsonLength, 36, true)
  view.setUint32(24 + jsonLength, 0x004e4942, true)
  new Float32Array(bytes, 28 + jsonLength, 9).set([-1, 0, 0, 1, 0, 0, 0, 2, 0])
  mutate?.(view)
  return new Blob([bytes], { type: 'model/gltf-binary' })
}

describe('模型导入的文件边界', () => {
  it('拒绝空文件，而不是只根据文件后缀接收', async () => {
    await expect(validateGlb(new Blob([]))).rejects.toThrow('文件为空')
  })

  it('拒绝伪装成 GLB 的任意内容', async () => {
    const file = new File(['This is not a model file.'], 'fake.glb')
    await expect(validateGlb(file)).rejects.toThrow('GLB')
  })

  it('在读取正文前拒绝超过 50 MiB 的文件', async () => {
    const file = new Blob([new Uint8Array(50 * 1024 * 1024 + 1)])
    await expect(validateGlb(file)).rejects.toThrow('50 MB')
  })

  it('接收自包含的原创三角形 GLB', async () => {
    await expect(validateGlb(glb())).resolves.toBeUndefined()
  })

  it.each([
    ['旧版', (view: DataView) => view.setUint32(4, 1, true), '2.0'],
    ['截断', (view: DataView) => view.setUint32(8, view.byteLength + 4, true), '长度'],
    ['越界块', (view: DataView) => view.setUint32(12, view.byteLength, true), '数据块'],
    ['未对齐块', (view: DataView) => view.setUint32(12, 3, true), '数据块'],
    ['首块非 JSON', (view: DataView) => view.setUint32(16, 0x004e4942, true), 'JSON'],
  ] as const)('拒绝%s文件', async (_name, mutate, message) => {
    await expect(validateGlb(glb(triangle(), mutate))).rejects.toThrow(message)
  })
})

describe('模型必须具有可展示的场景且资源自包含', () => {
  it('拒绝 JSON 正文损坏的 GLB', async () => {
    await expect(validateGlb(glb(triangle(), view => view.setUint8(20, 0xff)))).rejects.toThrow('JSON')
  })

  it('拒绝 GLB 头正确但 JSON 声明旧版本的模型', async () => {
    await expect(validateGlb(glb({ ...triangle(), asset: { version: '1.0' } }))).rejects.toThrow('2.0')
  })

  it.each([
    ['缺少房间场景', { scenes: [] }],
    ['没有网格', { meshes: [] }],
    ['不存在的默认场景', { scene: 9 }],
    ['不存在的节点', { scenes: [{ nodes: [4] }] }],
    ['不存在的网格', { nodes: [{ mesh: 8 }] }],
    ['循环节点', { nodes: [{ mesh: 0, children: [0] }] }],
    ['越界缓冲区', { bufferViews: [{ buffer: 0, byteLength: 40 }] }],
  ])('拒绝%s', async (_name, changes) => {
    await expect(validateGlb(glb({ ...triangle(), ...changes }))).rejects.toThrow()
  })

  it.each(['textures/wood.png', 'https://example.com/wood.png', 'file:///wood.png'])('拒绝依赖外部纹理 %s', async uri => {
    await expect(validateGlb(glb({ ...triangle(), images: [{ uri }] }))).rejects.toThrow('外部')
  })

  it('拒绝依赖外部二进制文件', async () => {
    await expect(validateGlb(glb({ ...triangle(), buffers: [{ byteLength: 36, uri: 'model.bin' }] }))).rejects.toThrow('外部')
  })

  it('允许内嵌的 data URI 纹理', async () => {
    await expect(validateGlb(glb({ ...triangle(), images: [{ uri: 'data:image/png;base64,iVBORw0KGgo=' }] }))).resolves.toBeUndefined()
  })
})
