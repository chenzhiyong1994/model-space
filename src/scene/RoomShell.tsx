import { Suspense, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { FloorStyle, Room } from '../types'
import { publicAsset } from '../publicAsset'

const THEMES = {
  ivory: { wall: '#ece8df', floor: '#e6e2d8', accent: '#697866', wood: '#c4a17c' },
  sage: { wall: '#cbd2c1', floor: '#dedfd3', accent: '#586b53', wood: '#c1a17d' },
  clay: { wall: '#dec7b8', floor: '#e8ddce', accent: '#8b6352', wood: '#b18765' },
}

// Poly Haven's source tile dimensions preserve the authored grain / grout scale in metres.
const FLOOR_FINISHES = {
  oak: { path: '/textures/decor/oak.jpg', metres: 1.2, color: '#b49776', roughness: 0.73 },
  terrazzo: { path: '/textures/decor/terrazzo.jpg', metres: 2, color: '#bbab98', roughness: 0.69 },
  slate: { path: '/textures/decor/slate.jpg', metres: 2.29, color: '#655d52', roughness: 0.59 },
} as const

function TexturedFloor({ style, width, depth }: { style: Exclude<FloorStyle, 'gallery'>; width: number; depth: number }) {
  const finish = FLOOR_FINISHES[style]
  const source = useTexture(publicAsset(finish.path))
  const texture = useMemo(() => {
    const result = source.clone()
    result.colorSpace = THREE.SRGBColorSpace
    result.wrapS = THREE.RepeatWrapping
    result.wrapT = THREE.RepeatWrapping
    result.repeat.set(width / finish.metres, depth / finish.metres)
    result.anisotropy = 8
    result.needsUpdate = true
    return result
  }, [source, width, depth, finish.metres])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]} />
    <meshStandardMaterial map={texture} roughness={finish.roughness} />
  </mesh>
}

function Label({ text, small = 'MODEL SPACE  /  COLLECTION 01' }: { text: string; small?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1536
    canvas.height = 512
    const context = canvas.getContext('2d')!
    context.fillStyle = '#424b3f'
    context.font = '500 42px Arial, "Microsoft YaHei", sans-serif'
    context.letterSpacing = '9px'
    context.fillText(small, 20, 92)
    context.letterSpacing = '4px'
    context.font = '500 178px Arial, "Microsoft YaHei", sans-serif'
    const title = text.length > 12 ? `${text.slice(0, 12)}…` : text
    context.fillText(title, 8, 325, 1475)
    context.fillStyle = '#788371'
    context.fillRect(18, 398, 126, 5)
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [text, small])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh><planeGeometry args={[3.2, 1.0667]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} /></mesh>
}

function FloorLines({ width, depth, visible }: { width: number; depth: number; visible: boolean }) {
  const geometry = useMemo(() => {
    const values: number[] = []
    for (let x = -width / 2 + 1; x < width / 2; x += 1) values.push(x, 0.006, -depth / 2, x, 0.006, depth / 2)
    for (let z = -depth / 2 + 1; z < depth / 2; z += 1) values.push(-width / 2, 0.006, z, width / 2, 0.006, z)
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(values, 3))
    return result
  }, [width, depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry}><lineBasicMaterial color={visible ? '#6e806a' : '#938e81'} transparent opacity={visible ? 0.28 : 0.07} /></lineSegments>
}

export default function RoomShell({ room, showGrid, enclosed = false }: { room: Room; showGrid: boolean; enclosed?: boolean }) {
  const { width, depth } = room
  const theme = THEMES[room.theme]
  const floor = room.floor ?? 'gallery'
  return <group>
    <mesh position={[0, -0.11, 0]} receiveShadow><boxGeometry args={[width + 0.2, 0.22, depth + 0.2]} /><meshStandardMaterial color={floor === 'gallery' ? theme.floor : FLOOR_FINISHES[floor].color} roughness={0.91} /></mesh>
    <mesh position={[0, -0.2, 0]}><boxGeometry args={[width + 0.05, 0.08, depth + 0.05]} /><meshStandardMaterial color="#aba799" roughness={0.83} /></mesh>
    {floor !== 'gallery' && <Suspense fallback={null}><TexturedFloor style={floor} width={width} depth={depth} /></Suspense>}
    {(showGrid || floor === 'gallery') && <FloorLines width={width} depth={depth} visible={showGrid} />}
    <mesh position={[0, 1.66, -depth / 2 - 0.08]} castShadow receiveShadow><boxGeometry args={[width + 0.32, 3.32, 0.16]} /><meshStandardMaterial color={theme.wall} roughness={0.94} /></mesh>
    <mesh position={[-width / 2 - 0.08, 1.66, 0]} castShadow receiveShadow><boxGeometry args={[0.16, 3.32, depth]} /><meshStandardMaterial color={theme.wall} roughness={0.94} /></mesh>
    {enclosed && <group>
      <mesh position={[width / 2 + 0.08, 1.66, 0]} castShadow receiveShadow><boxGeometry args={[0.16, 3.32, depth]} /><meshStandardMaterial color={theme.wall} roughness={0.94}/></mesh>
      <mesh position={[0, 1.66, depth / 2 + 0.08]} castShadow receiveShadow><boxGeometry args={[width + 0.32, 3.32, 0.16]} /><meshStandardMaterial color={theme.wall} roughness={0.94}/></mesh>
      <mesh position={[width / 2 - 0.015, 0.07, 0]}><boxGeometry args={[0.035, 0.14, depth]}/><meshStandardMaterial color="#cbc9bb" roughness={0.8}/></mesh>
      <mesh position={[0, 0.07, depth / 2 - 0.015]}><boxGeometry args={[width, 0.14, 0.035]}/><meshStandardMaterial color="#cbc9bb" roughness={0.8}/></mesh>
      <group position={[width / 2 - 0.025, 2.07, 0]} rotation={[0, -Math.PI / 2, 0]}><Label text={room.name} small={room.subtitle}/></group>
      <group position={[0, 2.07, depth / 2 - 0.025]} rotation={[0, Math.PI, 0]}><Label text="慢慢看，慢慢收藏" small="MODEL SPACE  /  MAKE ROOM FOR JOY"/></group>
    </group>}
    <mesh position={[0, 0.07, -depth / 2 + 0.015]}><boxGeometry args={[width, 0.14, 0.035]} /><meshStandardMaterial color="#cbc9bb" roughness={0.8} /></mesh>
    <mesh position={[-width / 2 + 0.015, 0.07, 0]}><boxGeometry args={[0.035, 0.14, depth]} /><meshStandardMaterial color="#cbc9bb" roughness={0.8} /></mesh>
    <group position={[width * 0.17, room.name === '萌物收藏馆' || room.name === '串珠工坊' ? 2.8 : 2.07, -depth / 2 + 0.025]} scale={room.name === '萌物收藏馆' || room.name === '串珠工坊' ? 0.7 : 1}><Label text={room.name} small={room.tour?.length ? `MODEL SPACE  /  ${String(room.tour.length).padStart(2, '0')} DISCOVERY STOPS` : undefined} /></group>
    <mesh position={[-width / 2 + 1.35, 1.68, -depth / 2 + 0.025]} receiveShadow><boxGeometry args={[2.1, 3.28, 0.065]} /><meshStandardMaterial color={theme.wood} roughness={0.85} /></mesh>
    {Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-width / 2 + 0.355 + i * 0.13, 1.68, -depth / 2 + 0.063]}><boxGeometry args={[0.025, 3.28, 0.035]} /><meshStandardMaterial color="#a88c6b" roughness={1} /></mesh>)}
    <mesh position={[-width / 2 + 0.035, 1.93, depth * 0.13]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.05, 1.44]} /><meshStandardMaterial color={theme.accent} roughness={0.82} /></mesh>
    <mesh position={[-width / 2 + 0.044, 1.98, depth * 0.13]} rotation={[0, Math.PI / 2, 0]}><ringGeometry args={[0.26, 0.265, 64]} /><meshBasicMaterial color="#dedfce" /></mesh>
    <mesh position={[-width / 2 + 0.049, 1.42, depth * 0.13]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.28, 0.009]} /><meshBasicMaterial color="#cbd0bc" /></mesh>
  </group>
}
