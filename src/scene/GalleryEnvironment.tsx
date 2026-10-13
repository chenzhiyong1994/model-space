import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/** Local studio reflections for lacquer, gemstones and glass. No CDN or HDRI network dependency. */
export default function GalleryEnvironment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const room = new RoomEnvironment()
    const generator = new PMREMGenerator(gl)
    const target = generator.fromScene(room, 0.04)
    const previous = scene.environment
    const intensity = scene.environmentIntensity
    scene.environment = target.texture
    scene.environmentIntensity = 0.42
    room.dispose(); generator.dispose()
    return () => { scene.environment = previous; scene.environmentIntensity = intensity; target.dispose() }
  }, [gl, scene])
  return null
}
