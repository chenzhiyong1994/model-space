import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import type { EditorMode, Room, SceneObject, TourTarget, TransformMode, Vec3 } from '../types'
import ObjectModel from './Objects'
import RoomShell from './RoomShell'
import Navigation from './Navigation'
import GalleryEnvironment from './GalleryEnvironment'

export interface SceneProps {
  room: Room
  selectedId: string | null
  onSelect: (id: string | null) => void
  onTransform: (id: string, patch: Partial<SceneObject>) => void
  mode: EditorMode
  transformMode: TransformMode
  snap: boolean
  showGrid: boolean
  focusTarget: { id: string | null; nonce: number }
  tourTarget?: TourTarget
  onTourFree?: () => void
  assetUrls: Record<string, string>
  onWalkExit: () => void
  onError?: (message: string) => void
}

function RendererHealth({ onError }: { onError?: (message: string) => void }) {
  const { gl } = useThree()
  const errorHandler = useRef(onError)
  errorHandler.current = onError
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); errorHandler.current?.('3D 显示暂时中断。场景数据已保留，请稍后重试或刷新页面。') }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl])
  return null
}

function SelectionOutline({ target }: { target: THREE.Group }) {
  const helper = useMemo(() => {
    const result = new THREE.BoxHelper(target, '#68886c')
    result.material.depthTest = false
    result.material.transparent = true
    result.material.opacity = 0.55
    result.renderOrder = 8
    return result
  }, [target])
  const ring = useRef<THREE.Mesh>(null)
  const bounds = useMemo(() => ({ box: new THREE.Box3(), size: new THREE.Vector3(), center: new THREE.Vector3() }), [])
  useFrame(() => {
    helper.update()
    if (!ring.current) return
    bounds.box.setFromObject(target)
    bounds.box.getSize(bounds.size)
    bounds.box.getCenter(bounds.center)
    const radius = Math.max(bounds.size.x, bounds.size.z, 0.8) * 0.7
    ring.current.scale.setScalar(radius)
    ring.current.position.set(bounds.center.x, 0.015, bounds.center.z)
  })
  useEffect(() => () => { helper.geometry.dispose(); helper.material.dispose() }, [helper])
  return <>
    <primitive object={helper} />
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.98, 1, 72]} /><meshBasicMaterial color="#6a896c" transparent opacity={0.65} depthWrite={false} /></mesh>
  </>
}

type ItemProps = Pick<SceneProps, 'room' | 'mode' | 'transformMode' | 'snap' | 'onSelect' | 'onTransform' | 'onError'> & {
  object: SceneObject
  selected: boolean
  url?: string
  registry: RefObject<Map<string, THREE.Group>>
  lastTransform: RefObject<number>
}

function SceneItem({ object, selected, url, room, mode, transformMode, snap, onSelect, onTransform, onError, registry, lastTransform }: ItemProps) {
  const { gl } = useThree()
  const [target, setTarget] = useState<THREE.Group | null>(null)
  const register = useCallback((group: THREE.Group | null) => {
    if (group) registry.current.set(object.id, group)
    else registry.current.delete(object.id)
    setTarget(group)
  }, [object.id, registry])
  const constrain = () => {
    if (!target) return
    target.position.x = THREE.MathUtils.clamp(target.position.x, -room.width / 2 + 0.12, room.width / 2 - 0.12)
    target.position.y = THREE.MathUtils.clamp(target.position.y, 0, 8)
    target.position.z = THREE.MathUtils.clamp(target.position.z, -room.depth / 2 + 0.12, room.depth / 2 - 0.12)
    target.scale.clampScalar(0.08, 12)
  }
  const commit = () => {
    if (!target) return
    lastTransform.current = performance.now()
    constrain()
    const rounded = (value: number) => Math.round(value * 1000) / 1000
    const position = target.position.toArray().map(rounded) as Vec3
    const rotation = [target.rotation.x, target.rotation.y, target.rotation.z].map(rounded) as Vec3
    const scale = target.scale.toArray().map(rounded) as Vec3
    onTransform(object.id, { position, rotation, scale })
  }
  useEffect(() => () => { gl.domElement.style.cursor = '' }, [gl])
  return <>
    <group ref={register} name={`model-space:${object.id}`} position={object.position} rotation={object.rotation} scale={object.scale}
      onClick={event => { if (mode !== 'edit') return; event.stopPropagation(); if (event.delta < 4 && performance.now() - lastTransform.current > 120) onSelect(object.id) }}
      onPointerOver={event => { if (mode !== 'edit') return; event.stopPropagation(); gl.domElement.style.cursor = 'pointer' }}
      onPointerOut={() => { gl.domElement.style.cursor = '' }}>
      <ObjectModel object={object} url={url} onError={onError} />
    </group>
    {selected && mode === 'edit' && target ? <>
      <SelectionOutline target={target} />
      {!object.locked ? <TransformControls object={target} mode={transformMode} size={0.83} space={transformMode === 'scale' ? 'local' : 'world'} translationSnap={snap ? 0.25 : null} rotationSnap={snap ? Math.PI / 12 : null} scaleSnap={snap ? 0.1 : null} onObjectChange={constrain} onMouseUp={commit} /> : null}
    </> : null}
  </>
}

function GalleryScene(props: SceneProps & { lastTransform: RefObject<number> }) {
  const registry = useRef(new Map<string, THREE.Group>())
  const { room, mode, selectedId, showGrid, assetUrls, lastTransform } = props
  const lightScale = Math.max(1, room.width / 12, room.depth / 10)
  // Re-capture contact shadows after a committed edit; the real-time light follows dragging.
  const shadowRevision = room.objects.filter(object => object.visible).map(object => `${object.id}:${object.position.join(',')}:${object.rotation.join(',')}:${object.scale.join(',')}`).join('|')
  return <>
    <color attach="background" args={['#edeae3']} />
    <GalleryEnvironment />
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#fffdf2', '#b3ae98', 1.4]} />
    <directionalLight position={[3 * lightScale, 10 * lightScale, 6 * lightScale]} intensity={2.7} color="#fff6e6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10 * lightScale} shadow-camera-right={10 * lightScale} shadow-camera-top={10 * lightScale} shadow-camera-bottom={-10 * lightScale} shadow-camera-near={0.5} shadow-camera-far={35 * lightScale} shadow-bias={-0.00035 / lightScale} shadow-normalBias={0.025} shadow-radius={3} onUpdate={light => light.shadow.camera.updateProjectionMatrix()} />
    <directionalLight position={[-5, 6, -2]} intensity={0.65} color="#eff3e6" />
    <RoomShell room={room} showGrid={mode === 'edit' && showGrid} enclosed={mode === 'walk'} />
    <ContactShadows key={`${room.id}:${room.width}:${room.depth}:${shadowRevision}`} position={[0, 0.009, 0]} opacity={0.27} scale={Math.max(room.width, room.depth) + 1} blur={2.4} far={5} resolution={512} frames={1} color="#635e4b" />
    {room.objects.filter(object => object.visible).map(object => <SceneItem key={object.id} object={object} selected={selectedId === object.id} url={object.assetId ? assetUrls[object.assetId] : undefined} room={room} mode={mode} transformMode={props.transformMode} snap={props.snap} onSelect={props.onSelect} onTransform={props.onTransform} onError={props.onError} registry={registry} lastTransform={lastTransform} />)}
    <Navigation room={room} mode={mode} focusTarget={props.focusTarget} tourTarget={props.tourTarget} onTourFree={props.onTourFree} registry={registry} onWalkExit={props.onWalkExit} onError={props.onError} />
    <RendererHealth onError={props.onError} />
  </>
}

function WebGLFallback({ onRetry }: { onRetry?: () => void }) {
  return <div role="status" style={{ display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 12, width: '100%', height: '100%', padding: 32, textAlign: 'center', background: '#edeae3', color: '#465243' }}>
    <div style={{ fontSize: 32 }}>◇</div>
    <strong style={{ fontSize: 18 }}>暂时无法显示 3D 空间</strong>
    <span style={{ maxWidth: 320, lineHeight: 1.8, fontSize: 13 }}>场景数据已保留。请确认浏览器启用了硬件加速，再重新打开 3D 视图。</span>
    {onRetry ? <button type="button" onClick={onRetry} style={{ border: '1px solid #929d88', borderRadius: 8, padding: '8px 18px', background: '#fffdf7', color: '#3e503d', cursor: 'pointer' }}>重试显示</button> : null}
  </div>
}

class CanvasBoundary extends Component<{ children: ReactNode; onError?: (message: string) => void }, { failed: boolean; revision: number }> {
  state = { failed: false, revision: 0 }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError?.('3D 视图启动失败，已保留当前项目。请检查浏览器硬件加速设置。') }
  render() {
    return this.state.failed ? <WebGLFallback onRetry={() => this.setState({ failed: false, revision: this.state.revision + 1 })} /> : <div key={this.state.revision} style={{ width: '100%', height: '100%' }}>{this.props.children}</div>
  }
}

export default function Scene(props: SceneProps) {
  const lastTransform = useRef(0)
  return <CanvasBoundary onError={props.onError}>
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [10.7, 9.9, 13.2], fov: 43, near: 0.05, far: 120 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} style={{ width: '100%', height: '100%', touchAction: 'none' }} fallback={<WebGLFallback />}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = THREE.SRGBColorSpace
        // ContactShadows needs transparent clearing in its offscreen pass.
        // The main scene's solid background still clears the visible canvas opaquely.
        gl.setClearAlpha(0)
      }}
      onPointerMissed={event => { if (event.type === 'click' && props.mode === 'edit' && performance.now() - lastTransform.current > 120) props.onSelect(null) }}>
      <GalleryScene {...props} lastTransform={lastTransform} />
    </Canvas>
  </CanvasBoundary>
}
