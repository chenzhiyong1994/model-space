export type Vec3 = [number, number, number]
export type AssetKind = 'plinth' | 'glass-case' | 'shelf' | 'bench' | 'plant' | 'lamp' | 'sculpture' | 'vase' | 'arch' | 'pedestal' | 'easel' | 'partition' | 'stones' | 'mobile' | 'orrery' | 'cat' | 'rug' | 'stanchion' | 'figurine' | 'kitten' | 'puppy' | 'bracelet' | 'arm-model' | 'bracelet-stand' | 'teddy' | 'bunny' | 'gashapon' | 'matryoshka' | 'candy-jar' | 'bead-tray' | 'wrist-display' | 'bracelet-steps' | 'bracelet-jade' | 'bracelet-amber' | 'bracelet-crystal' | 'bracelet-pearl' | 'bracelet-obsidian' | 'jewelry-counter' | 'collector-cabinet' | 'display-table' | 'rubber-duck' | 'toy-car' | 'imported' | 'decor-model' | 'welcome-counter' | 'marquee-sign' | 'arched-screen' | 'gallery-poster' | 'planter-box' | 'reading-rug' | 'wayfinding-sign'
export type Category = 'display' | 'model' | 'equipment'
export type FloorStyle = 'gallery' | 'oak' | 'terrazzo' | 'slate'
export type CollectibleId = 'moss-kitten' | 'honey-puppy' | 'rose-bunny' | 'cocoa-teddy' | 'sky-duck' | 'lilac-figurine'
export type DecorKitId = 'welcoming' | 'reading' | 'cozy' | 'playful'
export interface AssetDefinition { id: string; name: string; subtitle: string; kind: AssetKind; category: Category; color: string; size: Vec3; assetId?: string; decorId?: string }
export interface SceneObject { id: string; name: string; kind: AssetKind; category: Category; position: Vec3; rotation: Vec3; scale: Vec3; color: string; assetId?: string; decorId?: string; collectibleId?: CollectibleId; decorKitTag?: DecorKitId; locked: boolean; visible: boolean }
export interface TourStop { id: string; title: string; description: string; position: Vec3; yaw: number }
export interface TourTarget { stopId: string | null; nonce: number }
export interface Room { id: string; name: string; subtitle: string; theme: 'ivory' | 'sage' | 'clay'; floor?: FloorStyle; tour?: TourStop[]; width: number; depth: number; objects: SceneObject[] }
export interface ModelAsset { id: string; name: string; bytes: number; createdAt: string }
export interface Project { version: 1; name: string; rooms: Room[]; assets: ModelAsset[]; activeRoomId: string }
export type EditorMode = 'edit' | 'walk'
export type TransformMode = 'translate' | 'rotate' | 'scale'
