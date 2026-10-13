import { describe, expect, it, vi } from 'vitest'
import { requestWalkPointerLock } from '../src/scene/walkPointerLock'

function lockSurface(request: () => Promise<void> | void) {
  const listeners = new Map<string, Set<() => void>>()
  const document = {
    pointerLockElement: null as unknown,
    exitPointerLock: vi.fn(),
    addEventListener(type: string, handler: () => void) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(handler) },
    removeEventListener(type: string, handler: () => void) { listeners.get(type)?.delete(handler) },
  }
  const canvas = { requestPointerLock: request, ownerDocument: document } as unknown as HTMLElement
  return { canvas, document, emit: (type: string) => [...(listeners.get(type) ?? [])].forEach(handler => handler()), remaining: () => [...listeners.values()].reduce((n, handlers) => n + handlers.size, 0) }
}

describe('退出漫游时尚未完成的鼠标锁定请求', () => {
  it('请求完成前已退出时，迟到的成功锁定立即释放', async () => {
    let complete!: () => void
    const surface = lockSurface(() => new Promise<void>(resolve => { complete = resolve }))
    let disposed = false
    const error = vi.fn()
    requestWalkPointerLock(surface.canvas, () => disposed, error)
    disposed = true
    surface.document.pointerLockElement = surface.canvas
    complete()
    await Promise.resolve()
    expect(surface.document.exitPointerLock).toHaveBeenCalledOnce()
    expect(error).not.toHaveBeenCalled()
    expect(surface.remaining()).toBe(0)
  })
  it('旧浏览器返回 void 时仍通过晚到的原生事件释放锁定', () => {
    const surface = lockSurface(() => undefined)
    let disposed = false
    requestWalkPointerLock(surface.canvas, () => disposed, vi.fn())
    disposed = true
    surface.document.pointerLockElement = surface.canvas
    surface.emit('pointerlockchange')
    expect(surface.document.exitPointerLock).toHaveBeenCalledOnce()
    expect(surface.remaining()).toBe(0)
  })
  it('仍在漫游时正常锁定，拒绝后只提示一次并释放监听', async () => {
    const active = lockSurface(() => Promise.resolve())
    active.document.pointerLockElement = active.canvas
    requestWalkPointerLock(active.canvas, () => false, vi.fn())
    await Promise.resolve()
    expect(active.document.exitPointerLock).not.toHaveBeenCalled()
    expect(active.remaining()).toBe(0)
    const rejected = lockSurface(() => Promise.reject(new Error('denied')))
    const error = vi.fn()
    requestWalkPointerLock(rejected.canvas, () => false, error)
    await Promise.resolve()
    expect(error).toHaveBeenCalledOnce()
    expect(rejected.remaining()).toBe(0)
  })
})
