import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateGlb } from '../src/assets'
import { DECOR_MODELS } from '../src/decorCatalog'

const builtInModels = ['anatomical-hand.glb', 'rubber-duck-toy.glb', 'toy-car.glb', ...DECOR_MODELS.map(model => {
  const filename = new URL(model.url, 'https://example.invalid').pathname.match(/\/models\/(.+)$/)?.[1]
  if (!filename) throw new Error(`Invalid bundled model URL: ${model.url}`)
  return filename
})]

interface ModelDocument {
  buffers?: { uri?: string }[]
  images?: { uri?: string; bufferView?: number; mimeType?: string }[]
  extensionsUsed?: string[]
}

describe('随应用分发的外部模型', () => {
  it.each(builtInModels)('%s 通过实际 GLB 校验，资源完整且无需在线解码器', async filename => {
    const data = readFileSync(new URL(`../public/models/${filename}`, import.meta.url))
    const bytes = new Uint8Array(data)
    await expect(validateGlb(new Blob([bytes], { type: 'model/gltf-binary' }))).resolves.toBeUndefined()

    const jsonLength = new DataView(bytes.buffer).getUint32(12, true)
    const document = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as ModelDocument
    for (const buffer of document.buffers ?? []) expect(buffer.uri).toBeUndefined()
    for (const image of document.images ?? []) {
      expect(image.uri).toBeUndefined()
      expect(image.bufferView).toBeTypeOf('number')
      expect(['image/jpeg', 'image/png']).toContain(image.mimeType)
    }
    const offlineDecoders = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu']
    expect(document.extensionsUsed?.filter(extension => offlineDecoders.includes(extension)) ?? []).toEqual([])
  })
})
