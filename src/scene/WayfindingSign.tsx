import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { SceneObject } from '../types'

/** Independent, bottom-anchored sign; its saved name is the text visitors read. */
export function WayfindingSign({ object }: { object: SceneObject }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 960
    const context = canvas.getContext('2d')!
    context.fillStyle = '#f4efdf'
    context.fillRect(0, 0, 768, 960)
    context.strokeStyle = '#c5aa75'
    context.lineWidth = 3
    context.strokeRect(34, 34, 700, 892)
    context.textAlign = 'center'
    context.fillStyle = '#697865'
    context.font = '24px Georgia, serif'
    context.fillText('MODEL SPACE · DISCOVER', 384, 134)
    const [title, ...subtitle] = object.name.split(/[·｜|]/).map(part => part.trim())
    context.fillStyle = '#334a40'
    context.font = '500 80px "Microsoft YaHei", sans-serif'
    while (context.measureText(title).width > 620 && parseInt(context.font.split(' ')[1]) > 32) {
      const size = parseInt(context.font.split(' ')[1]) - 2
      context.font = `500 ${size}px "Microsoft YaHei", sans-serif`
    }
    context.fillText(title, 384, 440)
    context.fillStyle = '#7b7964'
    context.font = '28px "Microsoft YaHei", sans-serif'
    const detail = subtitle.join(' · ')
    context.fillText(detail || '慢慢走，发现一件喜欢的收藏', 384, 532, 630)
    context.strokeStyle = '#c5aa75'
    context.beginPath()
    context.moveTo(272, 633)
    context.lineTo(496, 633)
    context.stroke()
    context.fillStyle = '#496658'
    context.font = '42px Georgia, serif'
    context.fillText('↓', 384, 745)
    context.font = '22px "Microsoft YaHei", sans-serif'
    context.fillText('藏 境 · 游览导览', 384, 838)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4
    return map
  }, [object.name])
  useEffect(() => () => texture.dispose(), [texture])
  return <group>
    <RoundedBox args={[0.9, 0.045, 0.24]} position={[0, 0.0225, 0]} radius={0.01} smoothness={2} castShadow receiveShadow><meshStandardMaterial color="#39483e" roughness={0.7}/></RoundedBox>
    <mesh position={[0, 0.306, 0]} castShadow><boxGeometry args={[0.047, 0.522, 0.047]}/><meshStandardMaterial color="#b89d69" metalness={0.7} roughness={0.35}/></mesh>
    <RoundedBox args={[0.9, 1.03, 0.08]} position={[0, 0.985, 0]} radius={0.018} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={object.color} roughness={0.62}/></RoundedBox>
    {[-1, 1].map(side => <mesh key={side} position={[0, 0.985, side * 0.041]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
      <planeGeometry args={[0.81, 0.946]}/><meshBasicMaterial map={texture} toneMapped={false}/>
    </mesh>)}
  </group>
}
