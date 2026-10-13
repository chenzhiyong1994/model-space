import type { AssetDefinition, AssetKind, Project, SceneObject, Vec3 } from './types'
import { DECOR_BUILTINS, DECOR_MODELS } from './decorCatalog'

export const CATALOG: AssetDefinition[] = [
  { id: 'builtin-plinth', name: '方形展台', subtitle: '安放每一件主角', kind: 'plinth', category: 'display', color: '#e8dfd0', size: [1.18, 1, 1.18] },
  { id: 'builtin-pedestal', name: '圆形展台', subtitle: '让主角被环绕注视', kind: 'pedestal', category: 'display', color: '#ddd3c0', size: [0.95, 1.05, 0.95] },
  { id: 'builtin-glass-case', name: '玻璃展柜', subtitle: '留住细节与光', kind: 'glass-case', category: 'display', color: '#cfbea5', size: [1.46, 1.9, 1.16] },
  { id: 'builtin-shelf', name: '开放陈列架', subtitle: '让收藏各得其所', kind: 'shelf', category: 'display', color: '#b79b78', size: [1.88, 2.14, 0.68] },
  { id: 'builtin-arch', name: '拱形展架', subtitle: '为作品框住一束光', kind: 'arch', category: 'display', color: '#d8c7ae', size: [2.6, 3.2, 0.6] },
  { id: 'builtin-easel', name: '画架', subtitle: '支起一幅新的想法', kind: 'easel', category: 'display', color: '#9a7b57', size: [0.95, 1.75, 0.8] },
  { id: 'builtin-partition', name: '展墙隔断', subtitle: '把空间分出章节', kind: 'partition', category: 'display', color: '#e7e1d2', size: [1.9, 2.25, 0.4] },
  { id: 'builtin-sculpture', name: '流动的形态', subtitle: '一件关于平衡的雕塑', kind: 'sculpture', category: 'model', color: '#cd6845', size: [1, 1.9, 1] },
  { id: 'builtin-vase', name: '陶土花器', subtitle: '温润的日常器物', kind: 'vase', category: 'model', color: '#c49978', size: [0.65, 1.2, 0.65] },
  { id: 'builtin-stones', name: '叠石', subtitle: '一场关于平衡的练习', kind: 'stones', category: 'model', color: '#a8a29a', size: [0.72, 0.95, 0.72] },
  { id: 'builtin-mobile', name: '风动雕塑', subtitle: '悬在空气中的慢舞', kind: 'mobile', category: 'model', color: '#c96f45', size: [0.9, 2.1, 0.9] },
  { id: 'builtin-orrery', name: '星轨仪', subtitle: '把星空转进房间', kind: 'orrery', category: 'model', color: '#5b6876', size: [0.8, 0.85, 0.8] },
  { id: 'builtin-cat', name: '打盹的猫', subtitle: '展厅的常驻观众', kind: 'cat', category: 'model', color: '#d9a05b', size: [0.65, 0.35, 0.65] },
  { id: 'builtin-bench', name: '静观长椅', subtitle: '停留，也是欣赏', kind: 'bench', category: 'equipment', color: '#997d5b', size: [2.4, 0.65, 0.85] },
  { id: 'builtin-plant', name: '绿意盆栽', subtitle: '一角轻盈的生机', kind: 'plant', category: 'equipment', color: '#72876c', size: [1.1, 2.3, 1.1] },
  { id: 'builtin-lamp', name: '落地灯', subtitle: '让空间多一点温度', kind: 'lamp', category: 'equipment', color: '#b29160', size: [0.7, 2.5, 0.7] },
  { id: 'builtin-rug', name: '圆形地毯', subtitle: '脚下的一块柔软', kind: 'rug', category: 'equipment', color: '#c2ad8d', size: [2.3, 0.03, 2.3] },
  { id: 'builtin-stanchion', name: '观展围栏', subtitle: '为珍视之物留出距离', kind: 'stanchion', category: 'equipment', color: '#8c3b2f', size: [1.6, 0.98, 0.12] },
  { id: 'builtin-figurine', name: '娃娃手办', subtitle: '大头小身的可爱家伙', kind: 'figurine', category: 'model', color: '#e0876a', size: [0.4, 0.48, 0.36] },
  { id: 'builtin-kitten', name: '乖巧小猫', subtitle: '端端正正等夸奖', kind: 'kitten', category: 'model', color: '#e2a35c', size: [0.4, 0.6, 0.36] },
  { id: 'builtin-puppy', name: '吐舌小狗', subtitle: '见到你会摇尾巴', kind: 'puppy', category: 'model', color: '#d9b98c', size: [0.44, 0.6, 0.4] },
  { id: 'builtin-bracelet', name: '沉香木珠', subtitle: '细密木纹 · 金色隔珠', kind: 'bracelet', category: 'model', color: '#8a5134', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-bracelet-jade', name: '青玉手串', subtitle: '温润石纹 · 小巧金坠', kind: 'bracelet-jade', category: 'model', color: '#518e76', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-bracelet-amber', name: '蜜蜡琥珀', subtitle: '蜜糖光泽 · 云雾纹理', kind: 'bracelet-amber', category: 'model', color: '#c8862c', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-bracelet-crystal', name: '紫晶手串', subtitle: '紫罗兰色 · 抛光晶珠', kind: 'bracelet-crystal', category: 'model', color: '#9c7eb7', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-bracelet-pearl', name: '珍珠手链', subtitle: '柔和珠光 · 虹彩表面', kind: 'bracelet-pearl', category: 'model', color: '#f0e4d0', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-bracelet-obsidian', name: '黑曜石手串', subtitle: '深色镜面 · 暖金点缀', kind: 'bracelet-obsidian', category: 'model', color: '#332c38', size: [0.216, 0.18, 0.19] },
  { id: 'builtin-wrist-display', name: '展示腕台', subtitle: '手串上腕的样子', kind: 'wrist-display', category: 'display', color: '#d9a877', size: [0.36, 0.5, 0.3] },
  { id: 'builtin-bracelet-steps', name: '阶梯展示架', subtitle: '三层九款 · 绒面陈列', kind: 'bracelet-steps', category: 'display', color: '#e8e0d0', size: [0.74, 0.44, 0.55] },
  { id: 'builtin-bracelet-stand', name: '手串展示架', subtitle: '六色手串 · 软包横杆', kind: 'bracelet-stand', category: 'display', color: '#9a7b57', size: [0.69, 0.28, 0.22] },
  { id: 'builtin-jewelry-counter', name: '珠宝玻璃柜台', subtitle: '绒面台 · 黄铜框 · 收纳抽屉', kind: 'jewelry-counter', category: 'display', color: '#a98764', size: [2.4, 1.4, 1] },
  { id: 'builtin-collector-cabinet', name: '收藏陈列柜', subtitle: '四层十二格 · 暖光木饰面', kind: 'collector-cabinet', category: 'display', color: '#b49a79', size: [2.6, 2.4, 0.72] },
  { id: 'builtin-display-table', name: '精品陈列桌', subtitle: '软包桌面 · 开放双层', kind: 'display-table', category: 'display', color: '#ac8962', size: [2.4, 0.86, 1.2] },
  { id: 'builtin-toy-car', name: '合金赛车', subtitle: 'Khronos · CC0 精细模型', kind: 'toy-car', category: 'model', color: '#65a592', size: [0.205, 0.128, 0.42] },
  { id: 'builtin-rubber-duck', name: '橡皮小黄鸭', subtitle: 'Poly Haven · CC0 实物扫描', kind: 'rubber-duck', category: 'model', color: '#edbd36', size: [0.214, 0.286, 0.3] },
  { id: 'builtin-teddy', name: '绒毛小熊', subtitle: '抱紧就是安心', kind: 'teddy', category: 'model', color: '#c08a52', size: [0.5, 0.66, 0.45] },
  { id: 'builtin-bunny', name: '垂耳兔玩偶', subtitle: '安安静静陪着你', kind: 'bunny', category: 'model', color: '#efe7dc', size: [0.42, 0.75, 0.4] },
  { id: 'builtin-gashapon', name: '扭蛋机', subtitle: '转出一份小惊喜', kind: 'gashapon', category: 'model', color: '#d9583e', size: [0.5, 0.65, 0.45] },
  { id: 'builtin-matryoshka', name: '彩绘套娃', subtitle: '一层一层的惊喜', kind: 'matryoshka', category: 'model', color: '#d95f43', size: [0.36, 0.62, 0.36] },
  { id: 'builtin-candy-jar', name: '糖果罐', subtitle: '甜甜的待客心意', kind: 'candy-jar', category: 'equipment', color: '#e8b0b8', size: [0.32, 0.35, 0.32] },
  { id: 'builtin-bead-tray', name: '串珠托盘', subtitle: '正在串到一半的心意', kind: 'bead-tray', category: 'display', color: '#9a7b57', size: [0.55, 0.12, 0.36] },
  ...DECOR_BUILTINS,
  ...DECOR_MODELS.map((model): AssetDefinition => ({ id: `decor-${model.id}`, name: model.name, subtitle: model.subtitle, kind: 'decor-model', decorId: model.id, category: 'equipment', color: model.color, size: model.size })),
]

function placed(id: string, kind: AssetKind, position: Vec3, patch: Partial<SceneObject> = {}): SceneObject {
  const asset = CATALOG.find((item) => item.kind === kind)!
  return { id, name: asset.name, kind, category: asset.category, position, rotation: [0, 0, 0], scale: [1, 1, 1], color: asset.color, locked: false, visible: true, ...patch }
}

export const INITIAL_ROOM_NAMES = ['造物展厅', '形态实验室', '灵感储藏室', '萌物收藏馆', '串珠工坊']

/** Built-in geometry is always anchored to its bottom, including models on top of a plinth. */
export function createInitialProject(): Project {
  return {
    version: 1, name: '造物空间', activeRoomId: 'room-main', assets: [],
    rooms: [
      { id: 'room-main', name: '造物展厅', subtitle: '日常收藏 · 精选陈列', theme: 'ivory', width: 12, depth: 10, objects: [
        placed('main-plinth-01', 'plinth', [-1.6, 0, 0]),
        placed('main-sculpture-01', 'sculpture', [-1.6, 1, 0]),
        placed('main-plinth-02', 'plinth', [1.1, 0, 1.1], { scale: [0.8, 0.72, 0.8] }),
        placed('main-vase-01', 'vase', [1.1, 0.72, 1.1], { color: '#b79677' }),
        placed('main-case-01', 'glass-case', [2.9, 0, -2.7]),
        placed('main-vase-02', 'vase', [2.9, 0.71, -2.7], { scale: [0.65, 0.65, 0.65], color: '#78917c' }),
        placed('main-stanchion-01', 'stanchion', [2.9, 0, -1.5]),
        placed('main-shelf-01', 'shelf', [-2.8, 0, -3.8]),
        placed('main-partition-01', 'partition', [-4.9, 0, -4.35]),
        placed('main-plant-01', 'plant', [-4.65, 0, -2.7]),
        placed('main-mobile-01', 'mobile', [5, 0, -3.3]),
        placed('main-pedestal-01', 'pedestal', [-4.35, 0, 1.75]),
        placed('main-stones-01', 'stones', [-4.35, 1.05, 1.75]),
        placed('main-easel-01', 'easel', [4.1, 0, 2.4], { rotation: [0, -0.6, 0] }),
        placed('main-rug-01', 'rug', [-0.25, 0, 3.3]),
        placed('main-bench-01', 'bench', [-0.25, 0, 3.4]),
        placed('main-cat-01', 'cat', [-2.2, 0, 3], { rotation: [0, 0.7, 0] }),
        placed('main-lamp-01', 'lamp', [4.5, 0, -1]),
      ] },
      { id: 'room-lab', name: '形态实验室', subtitle: '材质研究 · 形态探索', theme: 'sage', width: 12, depth: 10, objects: [
        placed('lab-arch-01', 'arch', [0, 0, -3.3]),
        placed('lab-plinth-01', 'plinth', [0, 0, -0.9], { color: '#b6c4b3' }),
        placed('lab-sculpture-01', 'sculpture', [0, 1, -0.9], { color: '#89967c', rotation: [0, 0.7, 0] }),
        placed('lab-pedestal-01', 'pedestal', [-3.2, 0, 0.9], { color: '#c3cdc0' }),
        placed('lab-orrery-01', 'orrery', [-3.2, 1.05, 0.9]),
        placed('lab-stones-01', 'stones', [2.6, 0, -1.7], { color: '#9aa894' }),
        placed('lab-mobile-01', 'mobile', [4.2, 0, 1.9], { rotation: [0, 0.8, 0] }),
        placed('lab-partition-01', 'partition', [3.4, 0, -3.9]),
        placed('lab-plant-01', 'plant', [4.3, 0, -3.2]),
      ] },
      { id: 'room-archive', name: '灵感储藏室', subtitle: '未完待续 · 自由生长', theme: 'clay', width: 12, depth: 10, objects: [
        placed('archive-shelf-01', 'shelf', [-2, 0, -3.8]),
        placed('archive-shelf-02', 'shelf', [1.4, 0, -3.8]),
        placed('archive-partition-01', 'partition', [-4.9, 0, -1.9], { rotation: [0, Math.PI / 2, 0] }),
        placed('archive-rug-01', 'rug', [0, 0, -2.3], { color: '#c8a183' }),
        placed('archive-bench-01', 'bench', [0, 0, 1.1]),
        placed('archive-easel-01', 'easel', [-4.5, 0, 1.6], { rotation: [0, 0.9, 0] }),
        placed('archive-pedestal-01', 'pedestal', [4.4, 0, 1.5]),
        placed('archive-stones-01', 'stones', [4.4, 1.05, 1.5]),
        placed('archive-lamp-01', 'lamp', [4.2, 0, -2.8]),
      ] },
      { id: 'room-toys', name: '萌物收藏馆', subtitle: '收藏陈列 · 玩具与小小珍藏', theme: 'ivory', width: 12, depth: 10, objects: createToyCollection() },
      { id: 'room-beads', name: '串珠工坊', subtitle: '玉石 · 木珠 · 珍珠 · 佩戴体验', theme: 'clay', width: 12, depth: 10, objects: createJewelryCollection() },
    ],
  }
}

const JEWEL_KINDS: AssetKind[] = ['bracelet-jade', 'bracelet', 'bracelet-amber', 'bracelet-crystal', 'bracelet-pearl', 'bracelet-obsidian']
const TOY_KINDS: AssetKind[] = ['teddy', 'bunny', 'figurine', 'kitten', 'puppy', 'rubber-duck', 'matryoshka']
const TOY_COLORS = ['#c69060', '#eee3d6', '#a2b9ae', '#dcaa6c', '#dac5a8', '#edbd36', '#bd6a53']

function createToyCollection(): SceneObject[] {
  const result: SceneObject[] = []
  const shelfHeights = [0.3, 0.8, 1.3, 1.8]
  // Each toy is independently selectable; each sits on a real shelf surface.
  ;[-4.25, -1.4, 1.45].forEach((x, cabinet) => {
    result.push(placed(`toys-cabinet-${cabinet}`, 'collector-cabinet', [x, 0, -4.35]))
    shelfHeights.forEach((y, row) => [-0.84, 0, 0.84].forEach((offset, col) => {
      const variant = (cabinet * 4 + row * 3 + col) % TOY_KINDS.length
      const kind = TOY_KINDS[variant]
      const scale = kind === 'rubber-duck' ? 1.1 : kind === 'bunny' ? 0.52 : 0.6
      result.push(placed(`toys-cabinet-${cabinet}-${row}-${col}`, kind, [x + offset, y, -4.32], { color: TOY_COLORS[variant], scale: [scale, scale, scale], rotation: [0, (col - 1) * -0.16, 0] }))
    }))
  })
  result.push(placed('toys-table-0', 'display-table', [-2.65, 0, -0.8]), placed('toys-table-1', 'display-table', [1.2, 0, 0.15], { color: '#9aa995' }))
  ;[-2.65, 1.2].forEach((x, table) => [-0.76, 0, 0.76].forEach((offset, col) => {
    const variant = (table * 3 + col) % TOY_KINDS.length
    result.push(placed(`toys-feature-${table}-${col}`, table === 1 && col === 1 ? 'toy-car' : TOY_KINDS[variant], [x + offset, 0.86, table ? -0.02 : -0.98], { scale: [0.86, 0.86, 0.86], color: TOY_COLORS[variant] }))
    result.push(placed(`toys-jewel-${table}-${col}`, JEWEL_KINDS[table * 3 + col], [x + offset, 0.86, table ? 0.53 : -0.4], { scale: [1.1, 1.1, 1.1] }))
  }))
  result.push(
    placed('toys-car-01', 'toy-car', [-2.65, 0.25, -0.78], { rotation: [0, -0.7, 0] }),
    placed('toys-case-01', 'glass-case', [4.4, 0, -3.65]),
    placed('toys-bunny-hero', 'bunny', [4.4, 0.71, -3.65], { scale: [1.15, 1.15, 1.15] }),
    placed('toys-pedestal-01', 'pedestal', [4.3, 0, -0.45]),
    placed('toys-duck-hero', 'rubber-duck', [4.3, 1.05, -0.45], { scale: [1.65, 1.65, 1.65], rotation: [0, -0.3, 0] }),
    placed('toys-gashapon-01', 'gashapon', [-4.7, 0, 1.35], { scale: [1.5, 1.5, 1.5], rotation: [0, 0.6, 0] }),
    placed('toys-rug-01', 'rug', [0.3, 0, 3.15], { scale: [1.6, 1, 1] }),
    placed('toys-bench-01', 'bench', [0.2, 0, 3.4]),
    placed('toys-teddy-bench', 'teddy', [-0.35, 0.545, 3.4], { scale: [0.75, 0.75, 0.75] }),
    placed('toys-cat-01', 'cat', [-2.1, 0, 3.2]),
    placed('toys-plant-01', 'plant', [5.1, 0, 2.5]),
    placed('toys-lamp-01', 'lamp', [-5.15, 0, 3.0]),
  )
  return result
}

function createJewelryCollection(): SceneObject[] {
  const result: SceneObject[] = []
  ;[-4.25, -1.4].forEach((x, cabinet) => {
    result.push(placed(`beads-cabinet-${cabinet}`, 'collector-cabinet', [x, 0, -4.35], { color: '#a68970' }))
    ;[0.3, 0.8, 1.3, 1.8].forEach((y, row) => [-0.84, 0, 0.84].forEach((offset, col) => {
      const variant = (cabinet * 3 + row + col) % JEWEL_KINDS.length
      result.push(placed(`beads-cabinet-${cabinet}-${row}-${col}`, JEWEL_KINDS[variant], [x + offset, y, -4.28], { scale: [1.65, 1.65, 1.65] }))
    }))
  })
  result.push(placed('beads-counter-back', 'jewelry-counter', [2.15, 0, -3.85]))
  ;[-0.68, 0.68].forEach((x, i) => result.push(placed(`beads-back-steps-${i}`, 'bracelet-steps', [2.15 + x, 0.92, -3.86], { scale: [0.93, 0.93, 0.93] })))
  result.push(placed('beads-counter-left', 'jewelry-counter', [-4.3, 0, -0.6], { rotation: [0, Math.PI / 2, 0] }))
  ;[-0.78, 0, 0.78].forEach((offset, row) => [-0.24, 0.24].forEach((z, col) => {
    result.push(placed(`beads-counter-loose-${row}-${col}`, JEWEL_KINDS[row * 2 + col], [-4.3 + z, 0.92, -0.6 - offset], { scale: [1.6, 1.6, 1.6], rotation: [0, Math.PI / 2, 0] }))
  }))
  result.push(placed('beads-table-fitting', 'display-table', [-0.9, 0, -0.15]), placed('beads-table-collection', 'display-table', [2.7, 0, 0.3]))
  ;[-0.65, 0.65].forEach((x, i) => {
    result.push(placed(`beads-wrist-${i}`, 'wrist-display', [-0.9 + x, 0.86, -0.36], { scale: [1.65, 1.65, 1.65], color: i ? '#84573c' : '#518e76', rotation: [0, i ? -0.22 : 0.16, 0] }))
  })
  ;[-0.75, 0, 0.75].forEach((x, i) => result.push(placed(`beads-fitting-sample-${i}`, JEWEL_KINDS[i], [-0.9 + x, 0.86, 0.23], { scale: [1.25, 1.25, 1.25] })))
  result.push(placed('beads-table-stand', 'bracelet-stand', [2.7, 0.86, 0.08], { scale: [1.65, 1.65, 1.65] }))
  ;[-0.75, -0.25, 0.25, 0.75].forEach((x, i) => result.push(placed(`beads-table-sample-${i}`, JEWEL_KINDS[i + 2], [2.7 + x, 0.86, 0.69], { scale: [1.4, 1.4, 1.4] })))
  result.push(
    placed('beads-tray', 'bead-tray', [3.52, 0.86, 0.02], { scale: [0.85, 0.85, 0.85] }),
    placed('beads-pedestal', 'pedestal', [4.65, 0, -2.2]),
    placed('beads-hero-steps', 'bracelet-steps', [4.65, 1.05, -2.2], { scale: [0.92, 0.92, 0.92] }),
    placed('beads-rug', 'rug', [0.2, 0, 3.2], { color: '#cbb49a', scale: [1.6, 1, 1] }),
    placed('beads-bench', 'bench', [0.2, 0, 3.45]),
    placed('beads-plant', 'plant', [4.9, 0, 2.65]),
    placed('beads-lamp', 'lamp', [-4.9, 0, 2.6]),
  )
  return result
}
