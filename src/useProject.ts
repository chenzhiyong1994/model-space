import { useCallback, useEffect, useRef, useState } from 'react'
import { createInitialProject } from './catalog'
import { addProjectObject, addProjectRoom, commitHistory, createHistory, createId, duplicateProjectObject, loadStoredProject, MAX_ASSETS, moveProjectObject, persistProject, redoHistory, removeProjectObject, removeProjectRoom, syncShowcaseRooms, undoHistory, updateProjectObject, updateProjectRoom, validateProject } from './project'
import type { ObjectPatch, ProjectHistory, RoomPatch } from './project'
import type { AssetDefinition, ModelAsset, Project, Room } from './types'
import { applyDecorKit as applyProjectDecorKit, drawProjectCapsule } from './decor'

export type SaveStatus = 'saved' | 'saving' | 'error'

// Access through methods so blocked localStorage access is caught at the storage boundary.
const browserStorage = {
  getItem(key: string) { return window.localStorage.getItem(key) },
  setItem(key: string, value: string) { window.localStorage.setItem(key, value) },
}

export function useProject() {
  const [loaded] = useState(() => loadStoredProject(browserStorage, createInitialProject))
  const [history, setHistory] = useState(() => createHistory(loaded.project))
  const current = useRef(history)
  const writable = useRef(loaded.writable)
  const [storageError, setStorageError] = useState<string | null>(loaded.error)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(loaded.error ? 'error' : 'saved')
  const { present: project } = history

  const publish = useCallback((next: ProjectHistory) => {
    if (next === current.current) return
    current.current = next
    setHistory(next)
    setSaveStatus(writable.current ? 'saving' : 'error')
  }, [])
  const change = useCallback((update: (project: Project) => Project) => {
    // Resolve and validate synchronously: callers can show a normal toast for invalid user actions.
    publish(commitHistory(current.current, update(current.current.present)))
  }, [publish])

  useEffect(() => {
    if (!writable.current) return
    const flush = () => {
      const error = persistProject(browserStorage, current.current.present)
      setStorageError(error)
      setSaveStatus(error ? 'error' : 'saved')
    }
    const timer = window.setTimeout(flush, 300)
    const flushWhenHidden = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [project])

  const updateObject = useCallback((id: string, patch: ObjectPatch) => change((p) => updateProjectObject(p, id, patch)), [change])
  const addObject = useCallback((definition: AssetDefinition) => {
    const id = createId('object')
    change((p) => addProjectObject(p, definition, id))
    return id
  }, [change])
  const removeObject = useCallback((id: string) => change((p) => removeProjectObject(p, id)), [change])
  const duplicateObject = useCallback((id: string) => {
    const copyId = createId('object')
    change((p) => duplicateProjectObject(p, id, copyId))
    return copyId
  }, [change])
  const moveObject = useCallback((id: string, targetRoomId: string) => change((p) => moveProjectObject(p, id, targetRoomId)), [change])
  const setActiveRoom = useCallback((id: string) => {
    if (!current.current.present.rooms.some((room) => room.id === id)) throw new Error('找不到房间')
    if (current.current.present.activeRoomId === id) return
    publish({ ...current.current, present: { ...current.current.present, activeRoomId: id } })
  }, [publish])
  const addRoom = useCallback((name: string, theme: Room['theme']) => {
    const id = createId('room')
    change((p) => addProjectRoom(p, name, theme, id))
    return id
  }, [change])
  const syncShowcase = useCallback(() => {
    let result = { added: [] as string[], reset: [] as string[] }
    change((p) => { const next = syncShowcaseRooms(p); result = { added: next.added, reset: next.reset }; return next.project })
    return result
  }, [change])
  const updateRoom = useCallback((id: string, patch: RoomPatch) => change((p) => updateProjectRoom(p, id, patch)), [change])
  const applyDecorKit = useCallback((kitId: string) => change((p) => applyProjectDecorKit(p, kitId)), [change])
  const drawCapsule = useCallback((machineId: string, roll = Math.random()) => {
    const result = drawProjectCapsule(current.current.present, machineId, roll)
    publish(commitHistory(current.current, result.project))
    return { itemId: result.itemId, name: result.collectible.name, collectibleId: result.collectible.id }
  }, [publish])
  const removeRoom = useCallback((id: string) => change((p) => removeProjectRoom(p, id)), [change])
  const undo = useCallback(() => publish(undoHistory(current.current)), [publish])
  const redo = useCallback(() => publish(redoHistory(current.current)), [publish])
  const replaceProject = useCallback((value: Project) => {
    const verified = validateProject(value)
    writable.current = true
    setStorageError(null)
    // Recovery is one undoable operation; even an identical restore re-enables persistence.
    const next = commitHistory(current.current, verified)
    publish(next === current.current ? { ...next, present: verified } : next)
  }, [publish])
  const addAsset = useCallback((asset: ModelAsset) => {
    change((p) => {
      if (p.assets.some((existing) => existing.id === asset.id)) return p
      if (p.assets.length >= MAX_ASSETS) throw new Error(`模型库最多保存${MAX_ASSETS}个模型`)
      return { ...p, assets: [...p.assets, { ...asset }] }
    })
  }, [change])

  return {
    project, activeRoom: project.rooms.find((room) => room.id === project.activeRoomId)!,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0, saveStatus, storageError,
    updateObject, addObject, removeObject, duplicateObject, moveObject, setActiveRoom,
    addRoom, updateRoom, removeRoom, syncShowcase, undo, redo, replaceProject, addAsset, applyDecorKit, drawCapsule,
  }
}
