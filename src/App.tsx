import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowRight, Box, Check, ChevronDown, ChevronRight, Copy, Crosshair, DoorOpen, Expand, Eye, EyeOff, Footprints, Grid2X2, Grip, HelpCircle, Layers3, LockKeyhole, Maximize2, MousePointer2, Move3D, PackagePlus, Plus, Redo2, RotateCcw, RotateCw, Search, SlidersHorizontal, Sparkles, Trash2, Undo2, UnlockKeyhole, Upload, X } from 'lucide-react'
import { CATALOG, INITIAL_ROOM_NAMES } from './catalog'
import { useProject } from './useProject'
import { loadAssetUrls, storeAsset, validateGlb } from './assets'
import { exportBackup, readBackup } from './backup'
import { MAX_ROOM_DEPTH, MAX_ROOM_WIDTH, MIN_ROOM_SIZE } from './project'
import AssetPreview from './AssetPreview'
import DecorWorkshop from './DecorWorkshop'
import { CAPSULE_COLLECTION, FLOOR_STYLES, type CapsuleCollectible } from './decorCatalog'
import { getCapsuleCollection } from './decor'
import Scene from './scene/Scene'
import TourHud from './TourHud'
import type { AssetDefinition, Category, DecorKitId, EditorMode, Room, SceneObject, TourTarget, TransformMode, Vec3 } from './types'

const THEMES = [{ id: 'ivory', label: '暖白画廊', color: '#ddd8c9' }, { id: 'sage', label: '鼠尾草绿', color: '#849585' }, { id: 'clay', label: '陶土工坊', color: '#cba18b' }] as const
const COLORS = ['#ce704a', '#57776b', '#e0d5be', '#b6c77f', '#5b6876', '#393c35']
const CATEGORY_NAMES: Record<Category, string> = { display: '展示陈列', model: '模型作品', equipment: '辅助设备' }

function IconButton({ label, children, active, ...props }: { label: string; children: ReactNode; active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`icon-button ${active ? 'is-active' : ''}`} title={label} aria-label={label} {...props}>{children}</button>
}
function NumberField({ label, value, onCommit, step = .1, min, max }: { label: string; value: number; onCommit: (value: number) => void; step?: number; min?: number; max?: number }) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100))
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value])
  return <input aria-label={label} type="number" step={step} min={min} max={max} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={() => {
    const next = Number(draft)
    if (draft.trim() && Number.isFinite(next)) {
      const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
      setDraft(String(Math.round(bounded * 100) / 100))
      onCommit(bounded)
    }
    else setDraft(String(Math.round(value * 100) / 100))
  }} />
}
function TextField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <input aria-label={label} value={draft} maxLength={60} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={() => { if (draft.trim()) onCommit(draft.trim()); else setDraft(value) }} />
}

export default function App() {
  const state = useProject()
  const { project, activeRoom } = state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('edit')
  const [tourTarget, setTourTarget] = useState<TourTarget>({ stopId: null, nonce: 0 })
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [snap, setSnap] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [leftTab, setLeftTab] = useState<'library' | 'scene' | 'decor'>('library')
  const [category, setCategory] = useState<Category>('display')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<'room' | 'help' | 'delete-room' | 'restore' | 'sync-showcase' | 'capsule' | null>(null)
  const [capsuleResult, setCapsuleResult] = useState<CapsuleCollectible | null>(null)
  const [capsuleMachineId, setCapsuleMachineId] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomTheme, setNewRoomTheme] = useState<Room['theme']>('ivory')
  const [focusTarget, setFocusTarget] = useState({ id: null as string | null, nonce: 0 })
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})
  const [assetWarning, setAssetWarning] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'library' | 'inspector' | null>(null)
  const modelInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const restoreFile = useRef<File | null>(null)
  const notify = useCallback((message: string) => setNotice(message), [])
  const selected = activeRoom.objects.find(object => object.id === selectedId)
  const roomIndex = project.rooms.findIndex(room => room.id === activeRoom.id)

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5500); return () => clearTimeout(timer) }, [notice])
  useEffect(() => {
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      const modal = document.querySelector<HTMLElement>('[role="dialog"]')
      const initial = modal?.querySelector<HTMLElement>('input') ?? modal?.querySelector<HTMLElement>('button')
      initial?.focus()
    })
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] input:not(:disabled), [role="dialog"] select:not(:disabled)'))
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', trapFocus); opener?.focus() }
  }, [dialog])
  const assetKey = project.assets.map(asset => asset.id).join('|')
  useEffect(() => {
    let disposed = false
    let urls: Record<string, string> = {}
    loadAssetUrls(assetKey ? assetKey.split('|') : []).then(result => {
      urls = result.urls
      if (disposed) Object.values(urls).forEach(URL.revokeObjectURL)
      else { setAssetUrls(urls); setAssetWarning(result.missing.length ? `${result.missing.length} 个模型文件缺失，请从完整备份恢复。` : '') }
    }).catch(error => { if (!disposed) setAssetWarning(String(error.message)) })
    return () => { disposed = true; Object.values(urls).forEach(URL.revokeObjectURL) }
  }, [assetKey])

  const selectRoom = (id: string) => { state.setActiveRoom(id); setSelectedId(null); setMode('edit'); setMobilePanel(null) }
  const chooseTourStop = (stopId: string | null) => { setTourTarget(previous => ({ stopId, nonce: previous.nonce + 1 })); requestAnimationFrame(() => document.querySelector('canvas')?.focus({ preventScroll: true })) }
  const enterWalk = () => { setMode('walk'); setSelectedId(null); setMobilePanel(null); chooseTourStop(activeRoom.tour?.[0]?.id ?? null) }
  const selectTourRoom = (id: string) => { const room = project.rooms.find(room => room.id === id); if (!room) return; state.setActiveRoom(id); setSelectedId(null); chooseTourStop(room.tour?.[0]?.id ?? null) }
  const focus = (id: string | null) => setFocusTarget(previous => ({ id, nonce: previous.nonce + 1 }))
  const removeSelected = () => { if (!selected || selected.locked) return; state.removeObject(selected.id); setSelectedId(null); notify('已移除物体，可以撤销。') }
  const duplicateSelected = () => { try { if (selected) { const id = state.duplicateObject(selected.id); setSelectedId(id); notify('已复制到旁边。') } } catch (error) { notify((error as Error).message) } }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const inField = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')
      if (inField || dialog || mode === 'walk') return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) state.redo(); else state.undo(); return }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); return }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected() }
      if (event.key.toLowerCase() === 'g') setTransformMode('translate')
      if (event.key.toLowerCase() === 'r') setTransformMode('rotate')
      if (event.key.toLowerCase() === 's') setTransformMode('scale')
      if (event.key.toLowerCase() === 'f') focus(selected?.id ?? null)
      if (event.key === 'Escape') { setSelectedId(null); setMobilePanel(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const add = (asset: AssetDefinition) => { try { const id = state.addObject(asset); setSelectedId(id); setMode('edit'); setMobilePanel(null); notify(`已添加「${asset.name}」，拖动坐标轴调整摆放。`) } catch (error) { notify((error as Error).message) } }
  const importModel = async (file: File) => {
    setBusy(true)
    try {
      await validateGlb(file)
      const id = crypto.randomUUID()
      await storeAsset(id, file)
      const name = file.name.replace(/\.glb$/i, '').slice(0, 60) || '未命名模型'
      state.addAsset({ id, name, bytes: file.size, createdAt: new Date().toISOString() })
      setCategory('model'); setLeftTab('library')
      notify(`「${name}」已保存到模型库，点击卡片即可放入展厅。`)
    } catch (error) { notify(error instanceof Error ? error.message : '模型导入失败。') }
    finally { setBusy(false); if (modelInput.current) modelInput.current.value = '' }
  }
  const doExport = async () => { setBusy(true); try { await exportBackup(project); notify('完整备份已导出，包含展厅布局和模型文件。') } catch (error) { notify((error as Error).message) } finally { setBusy(false) } }
  const doRestore = async () => {
    if (!restoreFile.current) return
    setBusy(true)
    try { const restored = await readBackup(restoreFile.current); state.replaceProject(restored); setSelectedId(null); setMode('edit'); notify('展厅和模型文件已恢复。') }
    catch (error) { notify((error as Error).message) }
    finally { setBusy(false); setDialog(null); restoreFile.current = null; if (backupInput.current) backupInput.current.value = '' }
  }
  const imported: AssetDefinition[] = project.assets.map(asset => ({ id: asset.id, assetId: asset.id, name: asset.name, subtitle: `${(asset.bytes / 1024 / 1024).toFixed(1)} MB · GLB`, kind: 'imported', category: 'model', color: '#789180', size: [1.2, 1.2, 1.2] }))
  const filtered = [...CATALOG, ...imported].filter(asset => asset.category === category && asset.name.toLowerCase().includes(search.toLowerCase()))
  const missingShowcase = INITIAL_ROOM_NAMES.filter(name => !project.rooms.some(room => room.name === name))
  const existingShowcase = project.rooms.filter(room => INITIAL_ROOM_NAMES.includes(room.name)).map(room => room.name)
  const syncShowcase = () => {
    const result = state.syncShowcase()
    notify(result.reset.length ? '示例展厅已同步到最新布置，可撤销。' : '示例展厅布置完成。')
  }
  const updateTransform = (key: 'position' | 'rotation' | 'scale', index: number, value: number) => {
    if (!selected || selected.locked) return
    const next = [...selected[key]] as Vec3
    next[index] = key === 'rotation' ? value * Math.PI / 180 : value
    state.updateObject(selected.id, { [key]: next })
  }
  const patchSelected = (patch: Partial<SceneObject>) => { if (selected) state.updateObject(selected.id, patch) }
  const resizeRoom = (dimension: 'width' | 'depth', value: number) => {
    if (activeRoom[dimension] === value) return
    try {
      state.updateRoom(activeRoom.id, { [dimension]: value })
      notify('展厅尺寸已更新，物体摆放保持原位，可以撤销。')
    } catch (error) { notify(error instanceof Error ? error.message : '展厅尺寸未能更新。') }
  }
  const editRoomSize = () => {
    setSelectedId(null)
    setMobilePanel('inspector')
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-label="房间宽度"]')?.focus())
  }
  const applyDecoration = (id: string) => {
    try {
      state.applyDecorKit(id as DecorKitId)
      setSelectedId(null); setMode('edit'); setMobilePanel(null); focus(null)
      notify('这一角已经布置好，每件物品都可继续调整，整套可以一次撤销。')
    } catch (error) { notify(error instanceof Error ? error.message : '这套装潢暂时放不下。') }
  }
  const turnCapsule = (machineId: string) => {
    try {
      const result = state.drawCapsule(machineId)
      const collectible = CAPSULE_COLLECTION.find(item => item.id === result.collectibleId)!
      setCapsuleResult(collectible); setCapsuleMachineId(machineId); setSelectedId(result.itemId)
      setMode('edit'); setDialog('capsule'); focus(result.itemId)
    } catch (error) { notify(error instanceof Error ? error.message : '暂时无法转出收藏。') }
  }

  return <div className={`app-shell ${mode === 'walk' ? 'walking' : ''}`}>
    <header className="app-header">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="藏境首页"><span className="brand-mark"><Box size={24} strokeWidth={1.6}/></span><span><strong>藏境<span className="brand-dot">.</span></strong><small>MODEL SPACE</small></span></a>
      <div className="header-divider"/>
      <div className="project-title"><span>我的模型展示空间 <ChevronDown size={13}/></span><small><span className={`save-dot ${state.saveStatus === 'error' ? 'error' : ''}`}/>{state.saveStatus === 'error' ? '保存异常，请导出备份' : state.saveStatus === 'saving' ? '正在保存…' : '已自动保存到本机'}</small></div>
      <div className="header-actions"><div className="history-actions"><IconButton label="撤销 Ctrl+Z" disabled={!state.canUndo || mode === 'walk'} onClick={state.undo}><Undo2 size={18}/></IconButton><IconButton label="重做 Ctrl+Shift+Z" disabled={!state.canRedo || mode === 'walk'} onClick={state.redo}><Redo2 size={18}/></IconButton></div><IconButton label="操作指南" onClick={() => setDialog('help')}><HelpCircle size={19}/></IconButton><button aria-label="导出空间" className="button secondary backup-button" disabled={busy} onClick={doExport}><ArrowDownToLine size={16}/><span>导出空间</span></button><button className="button dark" disabled={busy} onClick={() => modelInput.current?.click()}><Upload size={16}/><span>{busy ? '处理中…' : '导入模型'}</span></button></div>
    </header>

    <div className="workspace">
      <aside className={`library-panel ${mobilePanel === 'library' ? 'mobile-open' : ''}`}>
        <div className="panel-tabs"><button className={leftTab === 'library' ? 'active' : ''} onClick={() => setLeftTab('library')}><Grid2X2 size={14}/>素材库</button><button className={leftTab === 'scene' ? 'active' : ''} onClick={() => setLeftTab('scene')} aria-label={`场景物体 ${activeRoom.objects.length}`}><Layers3 size={14}/>物体 <span>{activeRoom.objects.length}</span></button><button className={leftTab === 'decor' ? 'active' : ''} onClick={() => setLeftTab('decor')} aria-label="装潢工坊"><Sparkles size={14}/>装潢</button><button className="mobile-close" aria-label="关闭素材面板" onClick={() => setMobilePanel(null)}><X size={18}/></button></div>
        {leftTab === 'decor' ? <DecorWorkshop project={project} room={activeRoom} onApplyKit={applyDecoration} onAdd={add}/> : leftTab === 'library' ? <>
          <div className="library-intro"><h2>让创作，有处安放。</h2><p>从一座展台开始，布置你的空间。</p></div>
          <div className="search-field"><Search size={16}/><input type="search" aria-label="搜索素材" placeholder="搜索素材…" value={search} onChange={event => setSearch(event.target.value)}/><span>⌕</span></div>
          <div className="category-tabs">{(['display', 'model', 'equipment'] as Category[]).map(value => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{CATEGORY_NAMES[value]}</button>)}</div>
          <div className="catalog-scroll"><div className="catalog-heading"><span>{category === 'display' ? '空间的基础' : category === 'model' ? '作品与形态' : '给空间一点温度'}</span><small>{filtered.length} 件素材</small></div><div className="asset-grid">{filtered.map(asset => <button key={asset.id} className="asset-card" onClick={() => add(asset)} aria-label={`添加${asset.name}`}><div className={`asset-image kind-${asset.kind}`}><AssetPreview kind={asset.kind} color={asset.color} decorId={asset.decorId}/><span className="asset-add"><Plus size={14}/></span>{asset.kind === 'imported' && <span className="asset-format">GLB</span>}</div><strong>{asset.name}</strong><small>{asset.subtitle}</small></button>)}</div>{filtered.length === 0 && <div className="empty-search"><Search size={25}/><p>没有找到相关素材</p><button onClick={() => setSearch('')}>清除搜索</button></div>}
          {category === 'model' && <button className="upload-card" disabled={busy} onClick={() => modelInput.current?.click()}><PackagePlus size={24}/><strong>加入你的下一件作品</strong><span>导入 GLB · 最大 50 MB</span></button>}</div>
          <div className="library-note"><span className="tiny-spark"><Sparkles size={16}/></span><p>留白，也是展览的一部分。<small>点击素材添加，选中物体自由布置。</small></p></div>
        </> : <div className="scene-list"><div className="catalog-heading"><span>{activeRoom.name}</span><small>{activeRoom.objects.length} 件</small></div>{activeRoom.objects.map(object => <div key={object.id} className={`scene-row ${selectedId === object.id ? 'selected' : ''}`}><button className="scene-object-button" onClick={() => { setSelectedId(object.id); setMobilePanel(null); focus(object.id) }}><Box size={17}/><span>{object.name}<small>{CATEGORY_NAMES[object.category]}</small></span></button><IconButton label={`${object.visible ? '隐藏' : '显示'}${object.name}`} onClick={() => state.updateObject(object.id, { visible: !object.visible })}>{object.visible ? <Eye size={14}/> : <EyeOff size={14}/>}</IconButton></div>)}{!activeRoom.objects.length && <p className="empty-copy">展厅还是空的，去素材库添加第一件作品吧。</p>}</div>}
      </aside>

      <main className="viewport" aria-label="3D 展厅编辑器">
        <Scene room={activeRoom} selectedId={selected?.id ?? null} onSelect={setSelectedId} onTransform={state.updateObject} mode={mode} transformMode={transformMode} snap={snap} showGrid={showGrid} focusTarget={focusTarget} tourTarget={tourTarget} onTourFree={() => chooseTourStop(null)} assetUrls={assetUrls} onWalkExit={() => setMode('edit')} onError={notify}/>
        <div className="viewport-top"><div className="room-breadcrumb"><span className="room-index">{String(roomIndex + 1).padStart(2, '0')}</span><span><strong>{activeRoom.name}</strong><small>{activeRoom.subtitle}</small></span></div><div className="mode-switch"><button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}><MousePointer2 size={15}/>布置</button><button className={mode === 'walk' ? 'active' : ''} onClick={enterWalk}><Footprints size={16}/>漫游</button></div></div>
        <div className="mobile-tools"><IconButton label="打开素材库" active={mobilePanel === 'library'} onClick={() => setMobilePanel(mobilePanel === 'library' ? null : 'library')}><Grid2X2 size={19}/></IconButton><IconButton label="打开属性" active={mobilePanel === 'inspector'} onClick={() => setMobilePanel(mobilePanel === 'inspector' ? null : 'inspector')}><SlidersHorizontal size={19}/></IconButton></div>
        {mode === 'edit' && <><div className="view-tools"><IconButton label="编辑房间尺寸" onClick={editRoomSize}><Maximize2 size={18}/></IconButton><IconButton label="全景视角 F" onClick={() => focus(null)}><Expand size={18}/></IconButton><IconButton label="显示地面网格" active={showGrid} onClick={() => setShowGrid(!showGrid)}><Grid2X2 size={17}/></IconButton><span/><IconButton label="聚焦选中物体" disabled={!selected} onClick={() => focus(selected?.id ?? null)}><Crosshair size={18}/></IconButton></div><div className="transform-toolbar"><span className="toolbar-grip"><Grip size={17}/></span><IconButton label="移动 G" active={transformMode === 'translate'} onClick={() => setTransformMode('translate')}><Move3D size={20}/></IconButton><IconButton label="旋转 R" active={transformMode === 'rotate'} onClick={() => setTransformMode('rotate')}><RotateCw size={19}/></IconButton><IconButton label="缩放 S" active={transformMode === 'scale'} onClick={() => setTransformMode('scale')}><Maximize2 size={18}/></IconButton><span className="toolbar-divider"/><button className={`snap-button ${snap ? 'is-active' : ''}`} onClick={() => setSnap(!snap)} aria-pressed={snap}><Grid2X2 size={15}/><span>吸附</span><span className="switch-light"/></button></div></>}
        {mode === 'walk' && <TourHud room={activeRoom} rooms={project.rooms} target={tourTarget} onStop={chooseTourStop} onRoom={selectTourRoom} onExit={() => setMode('edit')}/>}
        <div className="viewport-footer"><span><span className="live-dot"/>实时 3D <span className="footer-separator">/</span> {activeRoom.width} × {activeRoom.depth} m</span><span className="navigation-tip">{mode === 'edit' ? '左键环绕 · 右键平移 · 滚轮缩放' : 'WASD 移动 · Esc 退出'}</span><span>1 m <span className="scale-ruler"/></span></div>
        {(assetWarning || state.storageError) && <div className="storage-warning" role="alert">{assetWarning || state.storageError}</div>}
      </main>

      <aside className={`inspector-panel ${mobilePanel === 'inspector' ? 'mobile-open' : ''}`}>
        <div className="inspector-heading"><span><SlidersHorizontal size={16}/>{selected ? '物体属性' : '空间设置'}</span><small>{selected ? 'OBJECT' : 'SPACE'}</small><button className="mobile-close" aria-label="关闭属性面板" onClick={() => setMobilePanel(null)}><X size={18}/></button></div>
        <div className="inspector-scroll">
          {selected ? <>
            <div className="selected-preview"><AssetPreview kind={selected.kind} color={selected.color} decorId={selected.decorId}/><span className="type-tag">{CATEGORY_NAMES[selected.category]}</span></div>
            <section className="inspector-section"><label className="field-label">物体名称</label><TextField key={selected.id} label="物体名称" value={selected.name} onCommit={name => patchSelected({ name })}/><div className="object-quick-actions"><button onClick={() => patchSelected({ locked: !selected.locked })}>{selected.locked ? <LockKeyhole size={14}/> : <UnlockKeyhole size={14}/>} {selected.locked ? '已锁定' : '锁定物体'}</button><button onClick={() => patchSelected({ visible: !selected.visible })}>{selected.visible ? <Eye size={14}/> : <EyeOff size={14}/>} {selected.visible ? '显示中' : '已隐藏'}</button></div></section>
            <section className={`inspector-section transforms ${selected.locked ? 'locked' : ''}`}><div className="section-heading"><h3>变换</h3><IconButton label="重置旋转和缩放" disabled={selected.locked} onClick={() => patchSelected({ rotation: [0, 0, 0], scale: [1, 1, 1] })}><RotateCcw size={13}/></IconButton></div><fieldset disabled={selected.locked}>{(['position', 'rotation', 'scale'] as const).map(key => <div className="transform-group" key={key}><div className="field-label"><span>{key === 'position' ? '位置' : key === 'rotation' ? '旋转' : '缩放'}</span><small>{key === 'position' ? '米' : key === 'rotation' ? '度' : '倍'}</small></div><div className="axis-fields">{['X', 'Y', 'Z'].map((axis, index) => <label key={axis}><span className={`axis-${axis.toLowerCase()}`}>{axis}</span><NumberField label={`${key === 'position' ? '位置' : key === 'rotation' ? '旋转' : '缩放'} ${axis}`} value={key === 'rotation' ? selected.rotation[index] * 180 / Math.PI : selected[key][index]} step={key === 'rotation' ? 15 : .1} min={key === 'scale' ? .1 : key === 'position' && index === 1 ? 0 : -100} max={key === 'scale' ? 10 : key === 'position' ? 100 : 360} onCommit={value => updateTransform(key, index, value)}/></label>)}</div></div>)}</fieldset></section>
            {selected.kind !== 'imported' && selected.kind !== 'decor-model' && <section className="inspector-section"><h3>材质色彩</h3><div className="color-options">{COLORS.map(color => <button key={color} aria-label={`材质颜色 ${color}`} title={color} style={{ backgroundColor: color }} className={selected.color.toLowerCase() === color ? 'selected' : ''} onClick={() => patchSelected({ color })}>{selected.color.toLowerCase() === color && <Check size={14}/>}</button>)}<label className="custom-color" title="自定义颜色"><Plus size={16}/><input aria-label="自定义材质颜色" type="color" value={selected.color} onChange={event => patchSelected({ color: event.target.value })}/></label></div></section>}
            <section className="inspector-section"><label className="field-label" htmlFor="object-room">所属展厅</label><div className="select-wrapper"><DoorOpen size={15}/><select id="object-room" value={activeRoom.id} onChange={event => { try { state.moveObject(selected.id, event.target.value); setSelectedId(null); notify('物体已移入目标展厅。') } catch (error) { notify((error as Error).message) } }}>{project.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select><ChevronDown size={13}/></div></section>
            {selected.kind === 'gashapon' && <section className="inspector-section capsule-interaction"><span className="eyebrow">A LITTLE SURPRISE</span><h3>给收藏，转一点惊喜。</h3><p>六款小伙伴，免费试玩。每一款都能自由摆放、撤销和保存。</p><button className="button dark" onClick={() => turnCapsule(selected.id)}><Sparkles size={15}/>免费扭一下<span>{getCapsuleCollection(project).length} / 6 已收集</span></button></section>}
            <div className="object-bottom-actions"><button className="button secondary" onClick={duplicateSelected}><Copy size={15}/>复制物体</button><IconButton label="移除选中物体 Delete" disabled={selected.locked} onClick={removeSelected}><Trash2 size={17}/></IconButton></div>
          </> : <>
            <div className="space-art"><span className="space-art-orbit"/><DoorOpen size={38} strokeWidth={1}/><span className="space-art-number">{String(roomIndex + 1).padStart(2, '0')}</span></div>
            <section className="inspector-section"><span className="eyebrow">A HOME FOR YOUR IDEAS</span><h2 className="room-name-title">每件作品，都值得被看见。</h2><p className="room-description">自由摆放展柜与作品，慢慢构建属于你的三维收藏。</p></section>
            <section className="inspector-section"><label className="field-label">展厅名称</label><TextField label="展厅名称" value={activeRoom.name} onCommit={name => state.updateRoom(activeRoom.id, { name })}/><div className="room-stats"><span><strong>{activeRoom.objects.filter(object => object.category === 'model').length}</strong><small>模型作品</small></span><span><strong>{activeRoom.objects.filter(object => object.category === 'display').length}</strong><small>展示陈列</small></span><span><strong>{Number((activeRoom.width * activeRoom.depth).toFixed(2))}<sup>m²</sup></strong><small>空间面积</small></span></div></section>
            <section className="inspector-section room-dimensions"><div className="section-heading"><h3>房间尺寸</h3><small>米 · m</small></div><div className="room-dimension-fields"><label><span>宽度</span><NumberField key={`${activeRoom.id}-width`} label="房间宽度" value={activeRoom.width} min={MIN_ROOM_SIZE} max={MAX_ROOM_WIDTH} step={.5} onCommit={value => resizeRoom('width', value)}/><small>{MIN_ROOM_SIZE}–{MAX_ROOM_WIDTH} m</small></label><label><span>进深</span><NumberField key={`${activeRoom.id}-depth`} label="房间进深" value={activeRoom.depth} min={MIN_ROOM_SIZE} max={MAX_ROOM_DEPTH} step={.5} onCommit={value => resizeRoom('depth', value)}/><small>{MIN_ROOM_SIZE}–{MAX_ROOM_DEPTH} m</small></label></div><p className="room-dimensions-hint">输入后按 Enter 或点击别处生效。宽、深均可扩至默认的 10 倍。</p><p className="room-dimensions-hint">物体保持原位；缩小后墙外的物体仍会保留，可撤销恢复尺寸。</p></section>
            <section className="inspector-section"><h3>空间氛围</h3><div className="theme-options">{THEMES.map(theme => <button key={theme.id} className={activeRoom.theme === theme.id ? 'selected' : ''} onClick={() => state.updateRoom(activeRoom.id, { theme: theme.id })}><span style={{ backgroundColor: theme.color }}>{activeRoom.theme === theme.id && <Check size={12}/>}</span>{theme.label}</button>)}</div></section>
            <section className="inspector-section floor-settings"><div className="section-heading"><h3>脚下的质感</h3><small>本地真实纹理</small></div><div className="floor-options">{FLOOR_STYLES.map(floor => <button key={floor.id} className={(activeRoom.floor ?? 'gallery') === floor.id ? 'selected' : ''} onClick={() => state.updateRoom(activeRoom.id,{floor:floor.id})} aria-pressed={(activeRoom.floor ?? 'gallery') === floor.id}><span className={`floor-swatch floor-${floor.id}`}>{(activeRoom.floor ?? 'gallery') === floor.id && <Check size={12}/>}</span>{floor.name}</button>)}</div><button className="workshop-link" onClick={() => { setLeftTab('decor'); setMobilePanel('library') }}><Sparkles size={14}/>打开装潢工坊<ChevronRight size={13}/></button></section>
            <section className="inspector-section room-settings-actions"><button onClick={() => backupInput.current?.click()} disabled={busy}><Upload size={15}/>从备份恢复空间<ChevronRight size={14}/></button><button className="danger-text" disabled={project.rooms.length <= 1} onClick={() => setDialog('delete-room')}><Trash2 size={15}/>删除当前展厅</button></section>
            <div className="inspector-hint"><MousePointer2 size={18}/><p>选择一个物体<small>在画面或场景列表中点选，<br/>即可调整它的位置与外观。</small></p></div>
          </>}
        </div>
      </aside>
    </div>

    <footer className="rooms-bar"><div className="rooms-label"><Layers3 size={18}/><span>我的展厅<small>{project.rooms.length} 个独立空间</small></span></div><div className="room-tabs">{project.rooms.map((room, index) => <button className={`room-tab ${room.id === activeRoom.id ? 'active' : ''}`} key={room.id} onClick={() => selectRoom(room.id)}><span className={`room-thumb theme-${room.theme}`}><DoorOpen size={21} strokeWidth={1.2}/></span><span><strong>{room.name}</strong><small>{String(index + 1).padStart(2, '0')} <span>·</span> {room.objects.length} 件物体</small></span>{room.id === activeRoom.id && <span className="room-active-indicator"/>}</button>)}</div><button aria-label="同步示例展厅" className="add-room showcase-add" onClick={() => { existingShowcase.length ? setDialog('sync-showcase') : syncShowcase() }}><Sparkles size={17}/><span>同步示例展厅</span></button><button aria-label="新建展厅" className="add-room" onClick={() => { setNewRoomName(''); setDialog('room') }}><Plus size={18}/><span>新建展厅</span></button><span className="version-tag">EARLY SPACE <span>v0.1</span></span></footer>

    <input ref={modelInput} className="file-input" aria-label="导入 GLB 模型文件" type="file" accept=".glb,model/gltf-binary" onChange={event => { const file = event.target.files?.[0]; if (file) void importModel(file) }}/>
    <input ref={backupInput} className="file-input" aria-label="恢复空间备份文件" type="file" accept=".modelspace,.json" onChange={event => { const file = event.target.files?.[0]; if (file) { restoreFile.current = file; setDialog('restore') } }}/>
    {notice && <div className="toast" role="status"><span><Check size={16}/></span>{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={15}/></button></div>}

    {dialog && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setDialog(null) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={event => { if (event.key === 'Escape' && !busy) setDialog(null) }}><IconButton label="关闭对话框" onClick={() => setDialog(null)} disabled={busy}><X size={19}/></IconButton>
      {dialog === 'room' && <form onSubmit={event => { event.preventDefault(); if (!newRoomName.trim()) return; try { const id = state.addRoom(newRoomName.trim(), newRoomTheme); selectRoom(id); setDialog(null); notify('新展厅已创建，从素材库开始布置吧。') } catch (error) { notify((error as Error).message) } }}><span className="modal-symbol"><DoorOpen size={26}/></span><span className="eyebrow">MAKE ROOM FOR MORE</span><h2 id="dialog-title">给灵感，开一间新展厅。</h2><p>按作品类型或创作主题，让每个收藏都有自己的空间。</p><label className="field-label" htmlFor="new-room-name">展厅名称</label><input autoFocus id="new-room-name" placeholder="例如：角色收藏馆" maxLength={40} value={newRoomName} onChange={event => setNewRoomName(event.target.value)} required/><label className="field-label">选择空间氛围</label><div className="theme-options modal-themes">{THEMES.map(theme => <button type="button" key={theme.id} className={newRoomTheme === theme.id ? 'selected' : ''} onClick={() => setNewRoomTheme(theme.id)}><span style={{ backgroundColor: theme.color }}>{newRoomTheme === theme.id && <Check size={13}/>}</span>{theme.label}</button>)}</div><button className="button dark modal-submit" type="submit" disabled={!newRoomName.trim()}>创建展厅<ArrowRight size={16}/></button></form>}
      {dialog === 'capsule' && capsuleResult && <><div className="capsule-reveal"><span className="eyebrow">A NEW LITTLE TREASURE</span><div className="capsule-reveal-art" style={{'--capsule-color':capsuleResult.color} as React.CSSProperties}><AssetPreview kind={capsuleResult.kind} color={capsuleResult.color}/><span className="capsule-reveal-spark one">✦</span><span className="capsule-reveal-spark two">✧</span></div><h2 id="dialog-title">你遇见了「{capsuleResult.name}」</h2><p>它已加入这间展厅，等你安排一个喜欢的位置。</p><span className="capsule-progress">小小惊喜图鉴 · {getCapsuleCollection(project).length} / {CAPSULE_COLLECTION.length} 已收藏</span></div><div className="modal-actions"><button className="button secondary" onClick={() => { setDialog(null); setLeftTab('scene') }}>去摆放它</button><button className="button dark" onClick={() => capsuleMachineId && turnCapsule(capsuleMachineId)}><Sparkles size={15}/>再扭一次</button></div></>}
      {dialog === 'help' && <><span className="modal-symbol"><MousePointer2 size={26}/></span><h2 id="dialog-title">在这里，像玩游戏一样布展。</h2><p>先放入展台，再把作品摆到喜欢的位置。所有修改会自动保存在当前浏览器。</p><div className="help-grid"><span>环绕 / 平移 / 缩放</span><strong>左键 / 右键 / 滚轮</strong><span>移动 / 旋转 / 缩放工具</span><strong><kbd>G</kbd><kbd>R</kbd><kbd>S</kbd></strong><span>聚焦物体 / 恢复全景</span><strong><kbd>F</kbd></strong><span>复制 / 撤销 / 重做</span><strong>Ctrl D / Z / Shift Z</strong><span>移除选中物体</span><strong><kbd>Delete</kbd></strong><span>漫游模式</span><strong>点击进入 · WASD · Shift</strong><span>退出漫游 / 取消选择</span><strong><kbd>Esc</kbd></strong></div><p className="help-note">导入自包含 GLB 文件；展柜与作品可独立摆放。导出空间会打包布局及原模型，便于备份或换电脑继续。当前为本机单人版。</p><button className="button dark modal-submit" onClick={() => setDialog(null)}>开始布置<ArrowRight size={16}/></button></>}
      {dialog === 'sync-showcase' && <><span className="modal-symbol"><Sparkles size={26}/></span><h2 id="dialog-title">同步示例展厅？</h2><p>将把示例展厅更新为最新布置：{missingShowcase.length ? <>新增「{missingShowcase.join('」「')}」。</> : null}{existingShowcase.length ? <>重置「{existingShowcase.join('」「')}」，这些展厅里的修改会被覆盖。</> : null}整个操作可以一次撤销。</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setDialog(null)}>取消</button><button className="button dark" disabled={busy} onClick={() => { syncShowcase(); setDialog(null) }}>同步展厅<ArrowRight size={16}/></button></div></>}
      {dialog === 'delete-room' && <><span className="modal-symbol"><Trash2 size={26}/></span><h2 id="dialog-title">删除「{activeRoom.name}」？</h2><p>这个展厅中的 {activeRoom.objects.length} 件物体也会移除。素材库中的模型文件会保留；可以通过撤销恢复展厅。</p><div className="modal-actions"><button className="button secondary" onClick={() => setDialog(null)}>保留展厅</button><button className="button danger" onClick={() => { state.removeRoom(activeRoom.id); setSelectedId(null); setDialog(null); notify('展厅已删除，可以撤销。') }}>删除展厅</button></div></>}
      {dialog === 'restore' && <><span className="modal-symbol"><Upload size={26}/></span><h2 id="dialog-title">恢复这个空间备份？</h2><p>将载入「{restoreFile.current?.name}」中的展厅和模型，替换当前布局。恢复后仍可撤销到当前空间。</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setDialog(null)}>取消</button><button className="button dark" disabled={busy} onClick={doRestore}>{busy ? '恢复中…' : '恢复空间'}</button></div></>}
    </section></div>}
  </div>
}
