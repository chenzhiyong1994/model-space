import type { Project } from './types'
import { getAsset, storeAsset, validateGlb } from './assets'
import { MAX_MODEL_BYTES, validateProject } from './project'

interface Backup { format: 'model-space'; version: 1; project: Project; files: Record<string, string> }
const MAX_BACKUP_BYTES = 200 * 1024 * 1024

export async function exportBackup(project: Project) {
  project = validateProject(project)
  const files: Record<string, string> = Object.fromEntries(project.assets.map(asset => [asset.id, '']))
  // Include the JSON envelope and base64 expansion before allocating large file strings.
  const envelope: Backup = { format: 'model-space', version: 1, project, files }
  const expectedBytes = new Blob([JSON.stringify(envelope)]).size + project.assets.reduce((total, asset) => total + 4 * Math.ceil(asset.bytes / 3), 0)
  if (expectedBytes > MAX_BACKUP_BYTES) throw new Error('完整备份超过 200 MB，请减少项目素材后重试。')
  for (const asset of project.assets) {
    const blob = await getAsset(asset.id)
    if (!blob) throw new Error(`模型“${asset.name}”的文件缺失，无法制作完整备份。`)
    if (blob.size !== asset.bytes) throw new Error(`模型“${asset.name}”的文件大小与项目记录不一致，请重新导入素材。`)
    files[asset.id] = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = () => reject(new Error('模型读取失败'))
      reader.readAsDataURL(blob)
    })
  }
  const backup: Backup = { format: 'model-space', version: 1, project, files }
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `藏境-${new Date().toISOString().slice(0, 10)}.modelspace`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export async function readBackup(file: File): Promise<Project> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('备份文件需小于 200 MB。')
  let input: Backup
  try { input = JSON.parse(await file.text()) as Backup } catch { throw new Error('这不是有效的藏境备份。') }
  if (input?.format !== 'model-space' || input.version !== 1 || !input.files || typeof input.files !== 'object' || Array.isArray(input.files)) throw new Error('备份格式或版本不受支持。')
  const project = validateProject(input.project)
  const blobs: { id: string; blob: Blob; oldId: string }[] = []
  for (const asset of project.assets) {
    const encoded = input.files[asset.id]
    if (typeof encoded !== 'string' || encoded.length > 4 * Math.ceil(MAX_MODEL_BYTES / 3)) throw new Error(`模型“${asset.name}”缺失或过大。`)
    let bytes: Uint8Array
    try { bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)) } catch { throw new Error(`模型“${asset.name}”的备份已损坏。`) }
    if (bytes.byteLength !== asset.bytes) throw new Error(`模型“${asset.name}”的文件大小与备份记录不一致。`)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'model/gltf-binary' })
    await validateGlb(blob)
    blobs.push({ id: crypto.randomUUID(), blob, oldId: asset.id })
  }
  // Write to new keys: a failed restore never overwrites the current project's files.
  for (const entry of blobs) await storeAsset(entry.id, entry.blob)
  const ids = new Map(blobs.map(entry => [entry.oldId, entry.id]))
  return { ...project, assets: project.assets.map(asset => ({ ...asset, id: ids.get(asset.id)! })), rooms: project.rooms.map(room => ({ ...room, objects: room.objects.map(object => object.assetId ? { ...object, assetId: ids.get(object.assetId)! } : object) })) }
}
