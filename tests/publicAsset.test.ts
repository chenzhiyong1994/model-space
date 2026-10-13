import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe.each(['/', '/model-space/'])('Bundled resources at %s', base => {
  it('loads catalogue models, thumbnails and the anatomical hand from the deployment base', async () => {
    vi.stubEnv('BASE_URL', base)
    vi.resetModules()
    const { DECOR_MODELS } = await import('../src/decorCatalog')
    const { ANATOMICAL_HAND_URL } = await import('../src/scene/handGeometry')

    expect(ANATOMICAL_HAND_URL).toBe(`${base}models/anatomical-hand.glb`)
    expect(DECOR_MODELS.length).toBeGreaterThan(0)
    const resources = [ANATOMICAL_HAND_URL, ...DECOR_MODELS.flatMap(model => [model.url, model.thumbnail])]

    for (const resource of resources) {
      expect(resource.startsWith(`${base}models/`), resource).toBe(true)
      const relativePath = resource.slice(base.length)
      const packagedFile = new URL(`../public/${relativePath}`, import.meta.url)
      expect(readFileSync(packagedFile).byteLength, resource).toBeGreaterThan(0)
    }
  })
})
