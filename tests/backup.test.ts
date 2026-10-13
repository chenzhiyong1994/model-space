import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportBackup, readBackup } from '../src/backup'
import { getAsset, storeAsset } from '../src/assets'
import type { Project, SceneObject } from '../src/types'

vi.mock('../src/assets', async importOriginal => ({
  ...await importOriginal<typeof import('../src/assets')>(),
  getAsset: vi.fn(),
  storeAsset: vi.fn(async () => {}),
}))

// Base64 of the original 628-byte tests/fixtures/triangle.glb; no Node-specific runtime is needed.
const encodedTriangle = 'Z2xURgIAAAB0AgAANAIAAEpTT057ImFzc2V0Ijp7InZlcnNpb24iOiIyLjAiLCJnZW5lcmF0b3IiOiJNb2RlbCBTcGFjZSBvcmlnaW5hbCB0cmlhbmdsZSBmaXh0dXJlIn0sInNjZW5lIjowLCJzY2VuZXMiOlt7Im5vZGVzIjpbMF19XSwibm9kZXMiOlt7Im1lc2giOjB9XSwibWVzaGVzIjpbeyJwcmltaXRpdmVzIjpbeyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjowfSwibWF0ZXJpYWwiOjB9XX1dLCJtYXRlcmlhbHMiOlt7Im5hbWUiOiJUZXJyYWNvdHRhIiwiZG91YmxlU2lkZWQiOnRydWUsInBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuNzYsMC4zNSwwLjIsMV0sIm1ldGFsbGljRmFjdG9yIjowLjE1LCJyb3VnaG5lc3NGYWN0b3IiOjAuNX19XSwiYWNjZXNzb3JzIjpbeyJidWZmZXJWaWV3IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MywidHlwZSI6IlZFQzMiLCJtaW4iOlstMSwwLDBdLCJtYXgiOlsxLDIsMF19XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZU9mZnNldCI6MCwiYnl0ZUxlbmd0aCI6MzZ9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6MzZ9XX0gICAkAAAAQklOAAAAgL8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAAAAAAABAAAAAAA=='
const triangle = Uint8Array.from(atob(encodedTriangle), char => char.charCodeAt(0))
const corruptedTriangle = triangle.slice()
new DataView(corruptedTriangle.buffer).setUint32(0, 0, true)
const corruptedEncoded = btoa(String.fromCharCode(...corruptedTriangle))
const imported = (id: string, assetId: string): SceneObject => ({
  id, assetId, name: '三角形', kind: 'imported', category: 'model', position: [1, 0, 2],
  rotation: [0, 0.5, 0], scale: [2, 2, 2], color: '#ffffff', locked: false, visible: true,
})

function originalProject(): Project {
  return {
    version: 1, name: '跨房间收藏', activeRoomId: 'room-two',
    assets: ['asset-first', 'asset-second'].map(id => ({ id, name: id, bytes: triangle.length, createdAt: '2026-10-05T12:00:00Z' })),
    rooms: [
      { id: 'room-one', name: '几何', subtitle: '', theme: 'ivory', width: 12, depth: 10, objects: [imported('object-one', 'asset-first'), imported('object-two', 'asset-second')] },
      { id: 'room-two', name: '重复使用', subtitle: '共享模型库', theme: 'sage', width: 10, depth: 8, objects: [imported('object-three', 'asset-first')] },
    ],
  }
}

function backup(project = originalProject(), files: unknown = { 'asset-first': encodedTriangle, 'asset-second': encodedTriangle }) {
  return new File([JSON.stringify({ format: 'model-space', version: 1, project, files })], 'collection.modelspace')
}

beforeEach(() => vi.clearAllMocks())

describe('完整项目恢复', () => {
  it('读取全部真实 GLB 并为每份素材分配新 id，保留跨房间的共享引用', async () => {
    const source = originalProject()
    const before = structuredClone(source)
    const restored = await readBackup(backup(source))
    expect(restored.activeRoomId).toBe('room-two')
    expect(restored.name).toBe('跨房间收藏')
    expect(restored.assets).toHaveLength(2)
    const [first, second] = restored.assets.map(asset => asset.id)
    expect(first).not.toBe('asset-first')
    expect(second).not.toBe('asset-second')
    expect(first).not.toBe(second)
    expect(restored.rooms[0].objects.map(object => object.assetId)).toEqual([first, second])
    expect(restored.rooms[1].objects[0].assetId).toBe(first)
    expect(restored.rooms[0].objects[0].position).toEqual([1, 0, 2])
    expect(restored.rooms[0].objects[0].scale).toEqual([2, 2, 2])
    expect(restored.rooms[0].objects[0].rotation).toEqual([0, 0.5, 0])
    expect(source).toEqual(before)
    expect(storeAsset).toHaveBeenCalledTimes(2)
    for (const [id, blob] of vi.mocked(storeAsset).mock.calls) {
      expect([first, second]).toContain(id)
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array(triangle))
    }
  })

  it.each([
    ['缺失后一个模型', { 'asset-first': encodedTriangle }],
    ['后一个模型不是 GLB', { 'asset-first': encodedTriangle, 'asset-second': corruptedEncoded }],
    ['后一个模型 base64 损坏', { 'asset-first': encodedTriangle, 'asset-second': '%%%broken%%%' }],
  ])('%s时先整体拒绝，不写入任何新素材或替换原布局', async (_name, files) => {
    const current = originalProject()
    const original = structuredClone(current)
    const replaceLayout = vi.fn()
    await expect(readBackup(backup(current, files)).then(replaceLayout)).rejects.toThrow()
    expect(replaceLayout).not.toHaveBeenCalled()
    expect(storeAsset).not.toHaveBeenCalled()
    expect(current).toEqual(original)
  })

  it.each([{ files: undefined }, { files: null }, { files: [] }])('拒绝缺失或非对象的 files 字段：$files', async ({ files }) => {
    const project = originalProject()
    project.assets = []
    project.rooms.forEach(room => { room.objects = [] })
    const file = new File([JSON.stringify({ format: 'model-space', version: 1, project, files })], 'bad.modelspace')
    await expect(readBackup(file)).rejects.toThrow('格式')
    expect(storeAsset).not.toHaveBeenCalled()
  })

  it('素材声明 bytes 与真实 GLB 字节不一致时拒绝整个恢复', async () => {
    const project = originalProject()
    project.assets[1].bytes = triangle.length - 4
    await expect(readBackup(backup(project))).rejects.toThrow('大小')
    expect(storeAsset).not.toHaveBeenCalled()
  })

  it('对字节大小一致的损坏文件执行真实 GLB 校验', async () => {
    await expect(readBackup(backup(originalProject(), {
      'asset-first': encodedTriangle, 'asset-second': corruptedEncoded,
    }))).rejects.toThrow('GLB')
    expect(storeAsset).not.toHaveBeenCalled()
  })

  it('在读取内容前拒绝超过 200 MB 的备份', async () => {
    const file = new File([], 'large.modelspace')
    Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 + 1 })
    const read = vi.spyOn(file, 'text')
    await expect(readBackup(file)).rejects.toThrow('200 MB')
    expect(read).not.toHaveBeenCalled()
    expect(storeAsset).not.toHaveBeenCalled()
  })
})

describe('完整备份的导出容量边界', () => {
  it('导出前计算 base64 膨胀，拒绝无法重新恢复的 200 MB 以上备份', async () => {
    const project = originalProject()
    project.assets = Array.from({ length: 4 }, (_, i) => ({
      id: i < 2 ? project.assets[i].id : `asset-${i}`, name: `模型 ${i}`, bytes: 50 * 1024 * 1024, createdAt: '2026-10-05T12:00:00Z',
    }))
    await expect(exportBackup(project)).rejects.toThrow('200 MB')
    expect(getAsset).not.toHaveBeenCalled()
  })
})
