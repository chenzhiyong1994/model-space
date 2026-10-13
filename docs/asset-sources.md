# 内置外部素材来源

素材准备日期为 2026-10-07 至 2026-10-09，各批次见下文。运行时只读取项目内的文件，不请求素材站或外部 CDN。下列第三方素材采用 CC0 1.0，其许可独立于项目原创代码的 MIT 许可；虽然 CC0 不要求署名，仍保留作者与来源方便追溯。

## 已采用素材

| 本地文件 | 原作与作者 | 许可 | 实际交付 |
| --- | --- | --- | --- |
| `public/models/anatomical-hand.glb` | [Posable anatomical right hand](https://www.innerscene.com/tools/library/3d-parts/posable-anatomical-right-hand-f6098b4f)，Innerscene，基于 MakeHuman / MPFB CC0 身体、骨架与皮肤资产 | 原页面明确采用 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 506,476 bytes；8,120 顶点、12,728 三角形；16 根骨骼，单材质、无贴图和外部依赖 |
| `public/models/rubber-duck-toy.glb` | [Rubber Duck Toy](https://polyhaven.com/a/rubber_duck_toy)，Plat251 / Poly Haven | [Poly Haven 资产许可](https://polyhaven.com/license)，[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 733,904 bytes；2,489 顶点、4,288 三角形；内嵌三张 1K JPG |
| `public/models/toy-car.glb` | [Toy Car](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/ToyCar/README.md)，Guido Odendahl 建模、Eric Chadwick 扩展与场景制作 / Khronos glTF Sample Assets | 原作 README 明确采用 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 4,127,188 bytes；68,470 顶点、91,331 三角形；两材质、五张内嵌 PNG |
| `public/textures/wood-table-001-diffuse.jpg` | [Wood Table 001](https://polyhaven.com/a/wood_table_001)，Dimitrios Savva 摄影、Rico Cilliers 处理 | [Poly Haven 资产许可](https://polyhaven.com/license)，[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 215,573 bytes；1024 × 1024 色彩图，仅用于展示家具的木材表面 |

### 手模

- [原始 GLB 下载](https://www.innerscene.com/api/library/posable-anatomical-right-hand-f6098b4f/download)。本地文件原封不动保留源网格与骨架。
- 原始姿态为自然弯曲的右手，未包含动画；其骨骼约束并不自动保证无穿模。项目在运行时烘焙静态姿态、处理腕口和连续前臂，并按腕部截面安排手串。源文件没有被修改。
- 原 GLB 的网格坐标范围为 X `[-0.018159, 0.118645]`、Y `[0, 0.073922]`、Z `[-0.210226, -0.024656]` 米。骨架含根变换，不能把这个范围直接视为最终展示朝向。

### 橡皮鸭

- 使用原站 [文件元数据 API](https://api.polyhaven.com/files/rubber_duck_toy) 中的 1K glTF 版本。原始 [glTF 文件](https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/rubber_duck_toy/rubber_duck_toy_1k.gltf) 与其引用的 `.bin`、Diffuse / Normal GL / ARM 三张 JPG 一并下载。
- 将这些文件按 glTF 2.0 的四字节对齐要求合并为一个 GLB；未更改网格、UV、材质参数或图片像素。纹理均改为内嵌 bufferView，不留下外部 URI。
- 保留 `KHR_materials_specular` 与 `KHR_materials_ior`。Three.js 的 GLTFLoader 原生支持这些材质扩展，无需 Draco、Meshopt 或 KTX2 下载器。
- 原始尺寸约 0.214 × 0.286 × 0.300 米。摆放时以实际包围盒底面为锚点。

### 木纹

- [原始 1K JPG 下载](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_table_001/wood_table_001_diff_1k.jpg)。只重命名文件，未修改像素。
- 色彩图按 sRGB 读取；家具材质单独设置粗糙度。该单张色彩图不等同于引入完整 PBR 贴图集。

### 合金玩具车

- [原始 GLB 下载](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb)，原文件 5,422,412 bytes。
- 删除示例场景的 Fabric 布景、八台摄影机，以及不再引用的材质、贴图和顶点数据；车体和玻璃的网格、UV、法线及原贴图像素保持不变。重新打包 bufferView 为一个自包含 GLB。
- 保留 `KHR_materials_clearcoat` 与 `KHR_materials_transmission`，由 Three.js 原生加载。未引入需要另下载解码器的压缩扩展。
- 源节点包含 X 轴 90° 旋转及 0.0001 倍缩放。应用这些变换后，车体宽约 0.018708 米、高 0.011624 米、长 0.038379 米；项目按展示用尺寸统一缩放并让轮胎底面落在底部锚点。
- 该模型保留了较高的几何细节，适合少量重点展陈；避免将其无控制地重复到每个架位。

## 文件完整性

SHA-256 对应上表的最终本地文件。

```text
anatomical-hand.glb
d1705ec1317516e79deb5c5ce4ef34e69bf6315bba9025e8a7374fbd0c745f47

rubber-duck-toy.glb
fecc6a71f2e5fd57bb7a2f6687ff8d24c4984161a4a5fa8bfe06ed54d544915a

toy-car.glb
aa78a6dfdcdc515c061baa721455692cc894ead8f9b6009ddd1fd26891245aca

wood-table-001-diffuse.jpg
460dd08d240f4a1f02982415048c3c5c200f385db212da18dc7e2df68bf4d0be
```

`tests/builtin-assets.test.ts` 读取实际内置 GLB，经过与用户导入相同的 `validateGlb` 校验，并检查内嵌资源与当前离线解码支持范围。文件哈希不代替场景视觉验证。

## 本轮检索取舍

- [TextureCan Marble 0014](https://www.texturecan.com/details/112/) 及其 [CC0 许可](https://www.texturecan.com/terms/) 已核实并下载检查。原始纹理具有明显的粗石杂色，和本次抛光珠串的效果不匹配，因此未打包到应用。珠串的轮廓、隔珠、金属配件和材质变化由项目自行建模。
- [WRAD ARMS](https://wriks.itch.io/wrad-arms) 明确采用 CC0，但其 1,200 三角形的复古 FPS 风格不适合精致饰品近景。相比之下，本轮采用的连续解剖手网格更合适。
- 成套珠宝柜架常含固定尺寸和陈列附件。本轮保留项目自行建模的柜架以确保尺寸、底部锚点、展示层面和房间布局一致，复用成熟木材纹理增加细节。

## 2026-10-08 · 收藏空间装潢

本轮从 Poly Haven 精选 11 件真实 PBR 模型及 3 张地面纹理，均在原站核实 [CC0 资产许可](https://polyhaven.com/license)。模型用于绿植、休息区、咖啡角和小件摆设；家具和装饰依然是可以单独移动、旋转与缩放的物体。运行时读取本地文件，首次打开也不依赖素材站或外部 CDN。

| 本地 GLB（位于 `public/models/decor/`） | 原作、作者 | 文件 bytes | 三角形 |
| --- | --- | ---: | ---: |
| `potted_plant_02.glb` | [Potted Plant 02](https://polyhaven.com/a/potted_plant_02)，Rico Cilliers | 2,632,372 | 69,806 |
| `potted_plant_04.glb` | [Potted Plant 04](https://polyhaven.com/a/potted_plant_04)，James Ray Cock | 2,119,996 | 8,929 |
| `mid_century_lounge_chair.glb` | [Mid Century Lounge Chair](https://polyhaven.com/a/mid_century_lounge_chair)，Kuutti Siitonen | 2,086,152 | 6,148 |
| `modern_arm_chair_01.glb` | [Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01)，Vibrant Nordic | 2,696,376 | 8,916 |
| `coffee_table_round_01.glb` | [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01)，Ulan Cabanilla | 1,562,324 | 4,044 |
| `modern_coffee_table_01.glb` | [Modern Coffee Table 01](https://polyhaven.com/a/modern_coffee_table_01)，Amin | 1,330,456 | 4,504 |
| `CoffeeCart_01.glb` | [Coffee Cart 01](https://polyhaven.com/a/CoffeeCart_01)，Joe Seabuhr | 1,833,204 | 27,659 |
| `ceramic_vase_01.glb` | [Ceramic Vase 01](https://polyhaven.com/a/ceramic_vase_01)，James Ray Cock | 417,640 | 10,296 |
| `ceramic_vase_03.glb` | [Ceramic Vase 03](https://polyhaven.com/a/ceramic_vase_03)，James Ray Cock | 764,344 | 11,136 |
| `brass_vase_03.glb` | [Brass Vase 03](https://polyhaven.com/a/brass_vase_03)，Rico Cilliers | 1,580,812 | 2,616 |
| `vintage_oil_lamp.glb` | [Vintage Oil Lamp](https://polyhaven.com/a/vintage_oil_lamp)，Monsta3D | 2,159,744 | 7,208 |

| 地面文件（位于 `public/textures/decor/`） | 原作、作者 | bytes | 平铺尺度 |
| --- | --- | ---: | ---: |
| `oak.jpg` | [Oak Wood Planks](https://polyhaven.com/a/oak_wood_planks)，Dimitrios Savva | 696,814 | 1.2 m |
| `terrazzo.jpg` | [Terrazzo Tiles](https://polyhaven.com/a/terrazzo_tiles)，Amal Kumar | 1,166,107 | 2 m |
| `slate.jpg` | [Slate Floor](https://polyhaven.com/a/slate_floor)，Dimitrios Savva | 707,276 | 2.29 m |

模型使用官方 API `files/<id>` 中的 1K glTF 及其引用文件，下载时逐项核对官方 MD5 和文件长度。按 glTF 2.0 四字节对齐规则打包 GLB，原始顶点、UV、PBR 贴图、材质与节点变换不变；所有图片和几何缓冲区内嵌，无外部 URI。古董油灯保留 `KHR_materials_specular`、`KHR_materials_ior`，由当前 Three.js 原生加载，无新增解码器。三张地面均为原封不动的 1024 × 1024 JPG 色彩图，并非完整 PBR 贴图集。

`public/models/decor/thumbnails/` 内的 11 张缩略图均由本地 Blender 5.2 / Cycles 自行渲染 CC0 模型，384 × 384 PNG、透明背景、24 samples 与降噪。未使用素材站的示例渲染、用户头像或 Logo。

最终模型合计 19,183,420 bytes、161,262 三角形；地面 2,570,197 bytes；自渲染缩略图 1,218,583 bytes；新增运行资源总计 22,972,200 bytes（约 21.9 MiB），单个 GLB 小于 3 MiB。11 个模型均经过应用实际使用的 `validateGlb` 校验；包围盒扫描覆盖 glTF 场景节点的世界变换与全部 POSITION 顶点，单位米、Y 向上。展示时依据真实包围盒做底部居中，家具尺寸沿用源模型的实际米尺寸。

重建入口为 `python scripts/prepare-decor-assets.py`，Python 标准库负责下载、哈希、打包和几何检查；传入 `--blender <blender可执行文件>` 可同时渲染缩略图。脚本从公开来源重新获取数据，在本地 `output/decor-upgrade/` 生成下载缓存与 `asset-manifest.json`，记录来源 URL、作者、哈希、包围盒、建议尺寸及加工过程。这些临时输出不随仓库分发，正常构建直接使用 `public/` 中的文件。重新加工素材后应同步本页与相应来源记录；文件哈希不代替浏览器视觉验证。

## 2026-10-09 · 沉浸游览馆藏

本轮补入 16 件带真实 PBR 贴图的 Poly Haven 模型，主题为复古科学与影像收藏、古典艺术、自然休憩与生活器物。原资产页与 [CC0 许可](https://polyhaven.com/license) 均已核实；允许免费使用、修改、商用及随应用再分发。准备脚本遵循 [公开 API 条款](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md)，发送标识本项目的 User-Agent，缓存元数据与源文件。应用运行时直接读取本地 GLB，不调用素材站 API。

| 本地 GLB（位于 `public/models/exploration/`） | 原作、作者 | bytes | 三角形 | 源模型尺寸 X × Y × Z（m） |
| --- | --- | ---: | ---: | --- |
| `Camera_01.glb` | [Camera 01](https://polyhaven.com/a/Camera_01)，Rajil Jose Macatangay | 2,436,380 | 26,987 | 0.214 × 0.078 × 0.263 |
| `vintage_video_camera.glb` | [Vintage Video Camera](https://polyhaven.com/a/vintage_video_camera)，James Ray Cock、Jenelle van Heerden | 2,708,472 | 18,682 | 0.071 × 0.145 × 0.133 |
| `vintage_microscope.glb` | [Vintage Microscope](https://polyhaven.com/a/vintage_microscope)，Luis José Fernández Rodríguez | 2,868,092 | 20,631 | 0.107 × 0.400 × 0.182 |
| `vintage_pocket_watch.glb` | [Vintage Pocket Watch](https://polyhaven.com/a/vintage_pocket_watch)，Tal Swicegood | 1,990,368 | 16,098 | 0.061 × 0.080 × 0.014 |
| `vintage_binocular.glb` | [Vintage Binoculars](https://polyhaven.com/a/vintage_binocular)，Luke | 2,743,988 | 19,362 | 0.194 × 0.068 × 0.199 |
| `book_encyclopedia_set_01.glb` | [Book Encyclopedia Set 01](https://polyhaven.com/a/book_encyclopedia_set_01)，John Malcolm | 3,238,480 | 67,306 | 0.551 × 0.237 × 0.163 |
| `binder_notebook.glb` | [Binder Notebook](https://polyhaven.com/a/binder_notebook)，DaDrood | 1,888,296 | 18,077 | 0.584 × 0.025 × 0.200 |
| `bronze_ray_statue.glb` | [Bronze Ray Statue](https://polyhaven.com/a/bronze_ray_statue)，Tina | 2,016,624 | 1,844 | 0.707 × 0.590 × 0.536 |
| `bronze_whale_statue.glb` | [Bronze Whale Statue](https://polyhaven.com/a/bronze_whale_statue)，Tina | 2,189,284 | 3,816 | 0.932 × 1.073 × 1.366 |
| `marble_bust_01.glb` | [Marble Bust 01](https://polyhaven.com/a/marble_bust_01)，Rico Cilliers | 897,424 | 17,456 | 0.272 × 0.515 × 0.300 |
| `horse_statue_01.glb` | [Horse Statue 01](https://polyhaven.com/a/horse_statue_01)，Rico Cilliers | 1,281,364 | 22,388 | 0.163 × 0.220 × 0.108 |
| `fern_02.glb` | [Fern 02](https://polyhaven.com/a/fern_02)，Rob Tuytel、Rico Cilliers | 1,143,740 | 6,232 | 1.973 × 0.428 × 1.724 |
| `rock_moss_set_01.glb` | [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01)，Kless Gyzen | 1,933,176 | 63,127 | 8.005 × 1.768 × 6.949 |
| `painted_wooden_bench.glb` | [Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench)，Kirill Sannikov | 1,988,768 | 630 | 1.165 × 0.889 × 0.497 |
| `vintage_grandfather_clock_01.glb` | [Vintage Grandfather Clock 01](https://polyhaven.com/a/vintage_grandfather_clock_01)，James Ray Cock、Yann Kervran | 2,353,936 | 8,582 | 0.626 × 2.191 × 0.427 |
| `vintage_suitcase.glb` | [Vintage Suitcase](https://polyhaven.com/a/vintage_suitcase)，Maximilian Schuster | 4,288,744 | 16,474 | 1.608 × 0.568 × 0.239 |

全部使用官方 1K glTF，并按官方 MD5、文件长度核对源文件。顶点、UV、法线、节点变换和贴图像素保持原样，几何与 JPG/PNG 纹理按四字节对齐嵌入普通 GLB；不含外部 URI，不含 Draco、Meshopt、KTX2 压缩。落地钟保留 Three.js 原生支持的 clearcoat、specular 和 ior 材质扩展。官方落地钟 glTF 的玻璃引用无 Alpha 的 JPG，自渲染检查发现表盘被不透明木色玻璃遮挡；仅将玻璃材质的 `baseColorFactor` Alpha 改为 0.035，使表盘重新可见，未修改模型几何与原图。

笔记簿、旅行箱、蕨叶与苔石是原作的组合模型，不是单一物件。包围盒扫描遍历完整 glTF 场景的实际世界顶点，保留 Y 向上、单位米的物理尺寸；应用按包围盒做 X/Z 居中与底部锚点。苔石组合源尺寸约 8 m，作为园景时适合整体缩至 0.3–0.45 倍；小型相机、怀表、奔马宜放于展台近距离观察。

`public/models/exploration/thumbnails/` 的 16 张 384 × 384 透明 PNG 全部由本机 Blender 5.2 / Cycles 24 samples 自行渲染 CC0 网格，未复制网站示例图。模型合计 35,967,136 bytes、327,692 三角形，每件均少于 70,000 三角形；缩略图合计 1,682,459 bytes，新增运行资源共 37,649,595 bytes（约 35.9 MiB）。16 件实际文件均经过应用的 `src/assets.ts` / `validateGlb` 校验，额外核实内嵌图片类型、无外部资源、无在线解码器与 SHA-256 清单一致。

重建入口：`python scripts/prepare-exploration-assets.py --blender <blender可执行文件>`。准备脚本只使用 Python 标准库，缩略图步骤使用 Blender 内置 Python；素材从公开来源下载。脚本在本地 `output/immersive-gallery/` 生成缓存和 `asset-manifest.json`，保存原始下载 URL、作者与分工、许可、官方 MD5、SHA-256、真实包围盒、建议尺寸、PBR 贴图通道及加工记录。这些输出由使用者运行脚本时产生，不是公开仓库的既有附件。正常构建使用已随附的模型，无需重新下载；省略 `--blender` 时不重新渲染缩略图。
