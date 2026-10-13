import type { AssetDefinition, AssetKind, CollectibleId, DecorKitId, FloorStyle, Vec3 } from './types'
import { publicAsset } from './publicAsset'

export interface DecorModel {
  id: string; name: string; subtitle: string; url: string; thumbnail: string; size: Vec3; color: string
}
const model = (id: string, name: string, subtitle: string, size: Vec3, color: string): DecorModel => ({
  id, name, subtitle, size, color, url: publicAsset(`models/decor/${id}.glb`), thumbnail: publicAsset(`models/decor/thumbnails/${id}.png`),
})
const exploration = (id: string, name: string, subtitle: string, size: Vec3, color: string): DecorModel => ({
  id, name, subtitle, size, color, url: publicAsset(`models/exploration/${id}.glb`), thumbnail: publicAsset(`models/exploration/thumbnails/${id}.png`),
})

// URLs are packaged locally; saved projects only keep a checked catalogue id.
export const DECOR_MODELS: DecorModel[] = [
  model('potted_plant_02', '斑叶陶盆绿植', '真实枝叶 · 一角绿意', [0.70116, 0.84118, 0.65739], '#7b906e'),
  model('potted_plant_04', '斑纹多肉', '舒展叶片 · 温润陶盆', [0.16789, 0.26746, 0.18475], '#879568'),
  model('mid_century_lounge_chair', '胡桃木皮革躺椅', '木框与皮革 · 慢慢坐一会', [1.00861, 1.16908, 1.19031], '#b98958'),
  model('modern_arm_chair_01', '北欧皮革扶手椅', '黑色皮革 · 木质扶手', [0.82034, 1.02285, 0.98656], '#c2b69e'),
  model('coffee_table_round_01', '大理石圆茶几', '白石台面 · 轻盈金属脚', [1.3013, 0.49101, 1.3013], '#997858'),
  model('modern_coffee_table_01', '现代长茶几', '流畅轮廓 · 创作的落脚处', [0.6, 0.39, 1.20183], '#b69d7b'),
  model('CoffeeCart_01', '复古咖啡推车', '咖啡角的仪式感', [2.16764, 1.71767, 1.07329], '#997753'),
  model('ceramic_vase_01', '白瓷花口瓶', '素雅器形 · 窗边小景', [0.20363, 0.40027, 0.20364], '#d6c5aa'),
  model('ceramic_vase_03', '现代细身陶瓶', '温润釉面 · 小小收藏', [0.11224, 0.41437, 0.11224], '#b99075'),
  model('brass_vase_03', '黄铜小花瓶', '暖金色光泽 · 精致点缀', [0.0825, 0.20037, 0.0825], '#b39660'),
  model('vintage_oil_lamp', '古董油灯', '旧日玻璃与金属 · 安静微光', [0.22, 0.80164, 0.22], '#a48b63'),
  exploration('Camera_01', '复古旁轴相机', '光影收藏 · 皮革与金属的细节', [0.2139, 0.07785, 0.26282], '#53574d'),
  exploration('vintage_video_camera', '三镜头电影摄影机', '光影收藏 · 记录旧日电影', [0.07121, 0.145, 0.13258], '#6a6b60'),
  exploration('vintage_microscope', '黄铜显微镜', '造物收藏 · 微观世界的入口', [0.1068, 0.39955, 0.18188], '#b29863'),
  exploration('vintage_pocket_watch', '古董怀表', '珍藏器物 · 留住时间的一刻', [0.06133, 0.07993, 0.01359], '#b19b66'),
  exploration('vintage_binocular', '复古望远镜', '光影收藏 · 向远处眺望', [0.194, 0.06844, 0.19923], '#5f6358'),
  exploration('book_encyclopedia_set_01', '旧版百科全书', '书房 · 每一册都是探索', [0.5513, 0.23742, 0.16306], '#997052'),
  exploration('binder_notebook', '皮面笔记簿组合', '书房 · 创作从这一页开始', [0.58403, 0.02529, 0.19996], '#876c51'),
  exploration('bronze_ray_statue', '青铜鳐鱼雕塑', '艺术收藏 · 海洋里的优雅弧线', [0.70749, 0.58965, 0.53555], '#778577'),
  exploration('bronze_whale_statue', '青铜鲸鱼雕塑', '艺术收藏 · 深海的温柔巨人', [0.932, 1.07292, 1.36585], '#75877b'),
  exploration('marble_bust_01', '古典大理石头像', '艺术收藏 · 凝在石中的神情', [0.27175, 0.51494, 0.29971], '#d4d0c2'),
  exploration('horse_statue_01', '奔马雕塑', '艺术收藏 · 停在飞奔的一瞬', [0.16299, 0.21998, 0.10779], '#a18b70'),
  exploration('fern_02', '野生蕨叶', '自然花园 · 真实扫描的枝叶', [1.97253, 0.42769, 1.72403], '#71836a'),
  exploration('rock_moss_set_01', '苔石组合', '自然花园 · 缩放出一座小山景', [8.0046, 1.76832, 6.94876], '#808673'),
  exploration('painted_wooden_bench', '复古木长椅', '休憩 · 斑驳漆面里的故事', [1.16494, 0.88929, 0.49654], '#748578'),
  exploration('vintage_grandfather_clock_01', '木制落地钟', '珍藏器物 · 老木与黄铜钟摆', [0.62562, 2.19059, 0.42662], '#997654'),
  exploration('vintage_suitcase', '复古旅行箱组合', '珍藏器物 · 一次想象中的远行', [1.60818, 0.56791, 0.23918], '#8e684f'),
]

export const DECOR_BUILTINS: AssetDefinition[] = [
  { id: 'builtin-wayfinding-sign', name: '游览导览牌', subtitle: '改名即换标题 · 给展区一个入口', kind: 'wayfinding-sign', category: 'equipment', color: '#47665a', size: [0.9, 1.5, 0.24] },
  { id: 'builtin-welcome-counter', name: '收藏小铺柜台', subtitle: '礼物包装 · 开店的第一步', kind: 'welcome-counter', category: 'display', color: '#c2a382', size: [2.2, 1.22, 0.82] },
  { id: 'builtin-marquee-sign', name: '小店招牌', subtitle: '一盏属于你的营业招牌', kind: 'marquee-sign', category: 'equipment', color: '#3f5e50', size: [1, 1.7, 0.35] },
  { id: 'builtin-arched-screen', name: '拱门装饰屏风', subtitle: '柔和曲线 · 为空间分景', kind: 'arched-screen', category: 'equipment', color: '#cfbda1', size: [1.5, 2.4, 0.3] },
  { id: 'builtin-gallery-poster', name: '收藏展海报', subtitle: '一张讲述收藏故事的画', kind: 'gallery-poster', category: 'equipment', color: '#a3846d', size: [1.05, 1.78, 0.42] },
  { id: 'builtin-planter-box', name: '花园长盆', subtitle: '用一排绿意轻轻划出边界', kind: 'planter-box', category: 'equipment', color: '#74836b', size: [1.5, 0.8, 0.5] },
  { id: 'builtin-reading-rug', name: '编织阅读地毯', subtitle: '围起一处舒服的停留', kind: 'reading-rug', category: 'equipment', color: '#c5aa85', size: [3, 0.025, 2.4] },
]

export interface DecorKit { id: DecorKitId; name: string; subtitle: string; description: string; floor: FloorStyle }
export const DECOR_KITS: DecorKit[] = [
  { id: 'welcoming', name: '精品开店', subtitle: '一间值得走进的小店', description: '迎宾柜台、暖色招牌、陶瓶与绿植，为珍藏留一处体面的入口。', floor: 'terrazzo' },
  { id: 'reading', name: '绿意阅读', subtitle: '坐下来和收藏相处', description: '皮革躺椅、圆茶几、编织地毯与枝叶，围起一个安静阅读角。', floor: 'oak' },
  { id: 'cozy', name: '创作咖啡', subtitle: '咖啡香里的灵感角', description: '咖啡推车、皮革座椅和复古灯，给创作留一处温暖停靠。', floor: 'oak' },
  { id: 'playful', name: '玩趣收藏', subtitle: '把小惊喜摆进小店', description: '扭蛋机、收藏桌和小店招牌；免费转出六款可独立摆放的小珍藏。', floor: 'terrazzo' },
]

export interface CapsuleCollectible { id: CollectibleId; name: string; kind: AssetKind; color: string; size: Vec3; scale: Vec3 }
export const CAPSULE_COLLECTION: CapsuleCollectible[] = [
  { id: 'moss-kitten', name: '苔绿小猫', kind: 'kitten', color: '#8ca489', size: [0.23, 0.305, 0.21], scale: [0.5, 0.5, 0.5] },
  { id: 'honey-puppy', name: '蜂蜜小狗', kind: 'puppy', color: '#e7bd74', size: [0.23, 0.3, 0.245], scale: [0.5, 0.5, 0.5] },
  { id: 'rose-bunny', name: '玫瑰小兔', kind: 'bunny', color: '#dca7ad', size: [0.12, 0.332, 0.144], scale: [0.4, 0.4, 0.4] },
  { id: 'cocoa-teddy', name: '可可小熊', kind: 'teddy', color: '#a97656', size: [0.288, 0.3168, 0.192], scale: [0.48, 0.48, 0.48] },
  { id: 'sky-duck', name: '阳光小鸭', kind: 'rubber-duck', color: '#edbd36', size: [0.214, 0.286, 0.3], scale: [1, 1, 1] },
  { id: 'lilac-figurine', name: '丁香小精灵', kind: 'figurine', color: '#b09cc8', size: [0.24, 0.336, 0.222], scale: [0.6, 0.6, 0.6] },
]

export const FLOOR_STYLES: { id: FloorStyle; name: string }[] = [
  { id: 'gallery', name: '画廊原色' }, { id: 'oak', name: '暖木地板' }, { id: 'terrazzo', name: '浅色水磨石' }, { id: 'slate', name: '灰蓝石砖' },
]
