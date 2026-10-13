import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import * as THREE from 'three'
import type { EditorMode, Room, TourTarget, Vec3 } from '../types'
import { roomView } from './roomView'
import { findWalkLanding, moveWalkPosition, walkObstacle, walkPositionBlocked, type WalkObstacle } from './walkNavigation'
import { requestWalkPointerLock } from './walkPointerLock'

interface Props {
  room: Room
  mode: EditorMode
  focusTarget: { id: string | null; nonce: number }
  registry: RefObject<Map<string, THREE.Group>>
  tourTarget?: TourTarget
  onTourFree?: () => void
  onWalkExit: () => void
  onError?: (message: string) => void
}

export default function Navigation({ room, mode, focusTarget, registry, tourTarget, onTourFree, onWalkExit, onError }: Props) {
  const { camera, gl, size } = useThree()
  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1.2
  const view = useMemo(() => roomView(room.width, room.depth, aspect), [room.width, room.depth, aspect])
  const { viewFit } = view
  const orbit = useRef<OrbitControlsType>(null)
  const walker = useRef<PointerLockControls | null>(null)
  const keys = useRef(new Set<string>())
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const callbacks = useRef({ onWalkExit, onError, onTourFree })
  callbacks.current = { onWalkExit, onError, onTourFree }
  const motion = useMemo(() => ({ position: new THREE.Vector3(), target: new THREE.Vector3(), box: new THREE.Box3(), size: new THREE.Vector3(), active: false, x: 0, z: 0 }), [])
  const collision = useMemo(() => ({ boxes: [] as WalkObstacle[], box: new THREE.Box3(), elapsed: 0 }), [])
  const tourActive = useRef(false)
  const walkRoom = useRef<string | null>(null)
  const roomRef = useRef(room)
  roomRef.current = room
  const refreshObstacles = () => {
    collision.boxes = []
    for (const object of roomRef.current.objects) {
      if (!object.visible) continue
      const group = registry.current.get(object.id)
      if (!group) continue
      group.updateWorldMatrix(true, true)
      const obstacle = walkObstacle(collision.box.setFromObject(group))
      if (obstacle) collision.boxes.push(obstacle)
    }
    collision.elapsed = 0
  }
  const { id: roomId, width, depth } = room

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => { reducedMotion.current = preference.matches }
    preference.addEventListener('change', changed)
    return () => preference.removeEventListener('change', changed)
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', mode === 'walk'
      ? '3D 展厅漫游。点击画面后使用 WASD 或方向键移动，Shift 加速。按住画面拖动环顾，或允许鼠标锁定后直接环顾。按 Esc 返回布置。'
      : '3D 展厅布置。鼠标左键拖动旋转视角，右键拖动平移，滚轮缩放。点击物体选中，在属性面板中调整位置、旋转和缩放。')
  }, [gl, mode])

  useLayoutEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.far = view.far
      camera.fov = mode === 'walk' ? 62 : 43
      camera.updateProjectionMatrix()
    }
    // Resizing the viewport updates projection without restarting a free walk.
    if (mode === 'walk' && walkRoom.current === roomId) return
    walkRoom.current = mode === 'walk' ? roomId : null
    motion.active = false
    motion.x = 0
    motion.z = 0
    keys.current.clear()
    if (mode === 'walk') {
      refreshObstacles()
      const entrance = roomRef.current.tour?.[0]
      const start: Vec3 = entrance?.position ?? [0, 1.68, depth / 2 - 1.05]
      const landing = findWalkLanding(start, roomRef.current, collision.boxes)
      camera.position.fromArray(landing ?? start)
      camera.rotation.set(0, entrance?.yaw ?? 0, 0, 'YXZ')
      gl.domElement.focus({ preventScroll: true })
    } else {
      camera.position.fromArray(view.position)
      camera.lookAt(...view.target)
      orbit.current?.target.fromArray(view.target)
      orbit.current?.update()
    }
  }, [roomId, width, depth, mode, camera, motion, view])

  useEffect(() => {
    if (mode !== 'walk') return
    const stop = roomRef.current.tour?.find(stop => stop.id === tourTarget?.stopId)
    tourActive.current = Boolean(stop)
    if (!stop) return
    motion.x = 0; motion.z = 0; keys.current.clear()
    refreshObstacles()
    const landing = findWalkLanding(stop.position, roomRef.current, collision.boxes)
    if (!landing) {
      callbacks.current.onError?.('这个导览点周围暂时没有可站立的空间，可以换一个点或退出漫游后调整布置。')
      return
    }
    camera.position.fromArray(landing)
    camera.rotation.set(0, stop.yaw, 0, 'YXZ')
    if (Math.hypot(landing[0] - stop.position[0], landing[2] - stop.position[2]) > .1) callbacks.current.onError?.('导览点被物体占用，已停在附近可通行的位置。')
  }, [roomId, mode, tourTarget?.stopId, tourTarget?.nonce, camera, motion])

  useEffect(() => {
    if (mode !== 'edit') return
    const object = focusTarget.id ? registry.current.get(focusTarget.id) : null
    if (object) {
      object.updateWorldMatrix(true, true)
      motion.box.setFromObject(object)
      motion.box.getCenter(motion.target)
      motion.box.getSize(motion.size)
      const distance = Math.max(motion.size.x, motion.size.y, motion.size.z, 0.18)
      motion.position.copy(motion.target).addScaledVector(new THREE.Vector3(1, 0.72, 1.35), distance * 1.65 * viewFit)
    } else {
      motion.position.fromArray(view.position)
      motion.target.fromArray(view.target)
    }
    motion.active = true
  }, [focusTarget.id, focusTarget.nonce, roomId, width, depth, mode, registry, motion, viewFit, view])

  useEffect(() => {
    if (mode !== 'walk') return
    const canvas = gl.domElement
    const controller = new PointerLockControls(camera, canvas)
    controller.pointerSpeed = 0.72
    controller.minPolarAngle = 0.12
    controller.maxPolarAngle = Math.PI - 0.12
    walker.current = controller
    let exited = false
    let disposed = false
    let lockUnavailable = false
    let dragging = false
    let dragged = false
    let pointerType = 'mouse'
    let pointerId = -1
    let pointerX = 0
    let pointerY = 0
    const viewRotation = new THREE.Euler(0, 0, 0, 'YXZ')
    const stopInput = () => {
      keys.current.clear()
      motion.x = 0
      motion.z = 0
      dragging = false
      pointerId = -1
    }
    const exit = () => {
      stopInput()
      if (!exited) { exited = true; callbacks.current.onWalkExit() }
    }
    const reportLockError = () => {
      if (disposed || lockUnavailable) return
      lockUnavailable = true
      callbacks.current.onError?.('可以按住画面拖动环顾，WASD 移动。按 Esc 返回布置。')
    }
    const lock = () => {
      if (controller.isLocked || lockUnavailable || dragged || pointerType === 'touch') return
      if (typeof canvas.requestPointerLock !== 'function') { reportLockError(); return }
      requestWalkPointerLock(canvas, () => disposed, reportLockError)
    }
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return
      canvas.focus({ preventScroll: true })
      if (controller.isLocked) return
      dragging = true
      dragged = false
      pointerType = event.pointerType
      pointerId = event.pointerId
      pointerX = event.clientX
      pointerY = event.clientY
    }
    const pointerMove = (event: PointerEvent) => {
      if (controller.isLocked || !dragging || event.pointerId !== pointerId) return
      const dx = event.clientX - pointerX
      const dy = event.clientY - pointerY
      pointerX = event.clientX
      pointerY = event.clientY
      if (!dx && !dy) return
      dragged = true
      viewRotation.setFromQuaternion(camera.quaternion, 'YXZ')
      viewRotation.y -= dx * 0.0016
      viewRotation.x = THREE.MathUtils.clamp(viewRotation.x - dy * 0.0016, -Math.PI / 2 + 0.12, Math.PI / 2 - 0.12)
      camera.quaternion.setFromEuler(viewRotation)
    }
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      dragging = false
      pointerId = -1
    }
    const pointerLeave = () => { if (!controller.isLocked) stopInput() }
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { exit(); return }
      if (!controller.isLocked && canvas.ownerDocument.activeElement !== canvas) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault()
        if (tourActive.current && !event.code.startsWith('Shift')) { tourActive.current = false; callbacks.current.onTourFree?.() }
        keys.current.add(event.code)
      }
    }
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.code)
    const blur = () => { stopInput(); if (controller.isLocked) controller.unlock() }
    canvas.addEventListener('click', lock)
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerleave', pointerLeave)
    canvas.addEventListener('pointercancel', stopInput)
    canvas.addEventListener('blur', blur)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    controller.addEventListener('unlock', exit)
    return () => {
      disposed = true
      canvas.removeEventListener('click', lock)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('pointercancel', stopInput)
      canvas.removeEventListener('blur', blur)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      controller.removeEventListener('unlock', exit)
      if (controller.isLocked) controller.unlock()
      controller.dispose()
      walker.current = null
      stopInput()
    }
  }, [camera, gl, mode, roomId, motion])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    if (mode === 'edit' && motion.active && orbit.current) {
      const alpha = reducedMotion.current ? 1 : 1 - Math.exp(-7 * dt)
      camera.position.lerp(motion.position, alpha)
      orbit.current.target.lerp(motion.target, alpha)
      orbit.current.update()
      if (camera.position.distanceToSquared(motion.position) < 0.0002 && orbit.current.target.distanceToSquared(motion.target) < 0.0002) motion.active = false
    }
    if (mode !== 'walk' || !walker.current || (!walker.current.isLocked && gl.domElement.ownerDocument.activeElement !== gl.domElement)) return
    collision.elapsed += dt
    if (collision.elapsed >= .6) {
      // Async GLBs can replace their loading bounds after entering the room.
      refreshObstacles()
      if (walkPositionBlocked(camera.position.x, camera.position.z, collision.boxes)) {
        const landing = findWalkLanding(camera.position.toArray() as Vec3, roomRef.current, collision.boxes)
        if (landing) camera.position.fromArray(landing)
      }
    }
    const held = keys.current
    let x = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'))
    let z = Number(held.has('KeyW') || held.has('ArrowUp')) - Number(held.has('KeyS') || held.has('ArrowDown'))
    const length = Math.hypot(x, z)
    const sprintScale = Math.min(4, Math.sqrt(Math.max(1, width / 12, depth / 10)))
    const speed = held.has('ShiftLeft') || held.has('ShiftRight') ? 5 * sprintScale : 2.65
    if (length > 0) { x = x / length * speed; z = z / length * speed }
    const alpha = 1 - Math.exp(-12 * dt)
    motion.x += (x - motion.x) * alpha
    motion.z += (z - motion.z) * alpha
    motion.position.copy(camera.position)
    walker.current.moveRight(motion.x * dt)
    walker.current.moveForward(motion.z * dt)
    const requested: Vec3 = [camera.position.x - motion.position.x, 0, camera.position.z - motion.position.z]
    camera.position.fromArray(moveWalkPosition(motion.position.toArray() as Vec3, requested, roomRef.current, collision.boxes))
  })

  return mode === 'edit' ? <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={0.085} minDistance={0.25} maxDistance={view.maxDistance} minPolarAngle={0.15} maxPolarAngle={Math.PI / 2 - 0.045} zoomSpeed={0.75} panSpeed={0.8} rotateSpeed={0.65} onStart={() => { motion.active = false }} /> : null
}
