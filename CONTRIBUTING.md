# 参与贡献

欢迎帮助藏境变得更好。问题反馈、交互改进、渲染优化、文档修正和来源清楚的开放素材都很有价值。

## 本地开发

需要 Node.js 22.12+，浏览器需要 WebGL 与硬件加速。

```bash
npm ci
npm run dev
```

固定访问 `http://127.0.0.1:5188/`。页面的展厅数据属于该浏览器及站点地址；测试导入、恢复、同步示例或清理存储时，请使用专用浏览器配置，并为需要保留的作品导出 `.modelspace` 备份。

## 提交改进

为一个明确问题保持聚焦的改动。问题反馈请说明复现步骤、预期与实际结果、浏览器版本，并在适用时附上截图和经过检查、不含私人内容的最小 GLB。涉及较大产品方向的改动，可以先开 Issue 说明使用场景和方案。

提交 Pull Request 前运行：

```bash
npm test
npm run build
```

影响画面或交互的修改，还应在真实浏览器中检查相关场景、实际操作和控制台。描述中写明修复的问题、验证方式，以及仍有的限制。修改用户流程时同步使用指南；修改素材时同步来源记录。

## 数据与场景约定

- 共享契约在 `src/types.ts`。项目导入与恢复必须经过 `validateProject`，GLB 通过 `validateGlb`；不要直接信任备份中的数据。
- 使用米制、Y 向上、物体底部锚点。模型、展架和辅助设备均为独立实例。
- 原模型 Blob 保存在 IndexedDB，布局保存在 LocalStorage；object URL 只用于当前运行过程。
- 一次几何拖动在结束时提交一条历史，避免逐帧写 React state 或存档。
- 内置模型、纹理和环境资源随项目提供。新增解码器或模型格式时，同步更新支持范围与验证。
- 保持单人、本地存储的使用方式。账号、外部上传或云同步属于需要单独讨论的产品范围。

## 部署项目主页与展厅

仓库的 `.github/workflows/pages.yml` 在 Pull Request 和 `main` 分支运行依赖安装、测试与 Pages 构建。推送到 `main` 后，检查通过会自动发布 GitHub Pages；Pull Request 只验证，不部署。

在仓库 **Settings → Pages → Build and deployment** 中将 **Source** 设置为 **GitHub Actions**。也可以在 Actions 页面手动运行 `Verify and deploy` 工作流，从 `main` 部署。

两种构建均输出到 `dist/`，用途如下：

| 命令 | 站点根路径 | 其他入口 |
| --- | --- | --- |
| `npm run build` | 展厅应用 | `/site/` 为项目主页 |
| `npm run build:pages` | 项目主页 | `/app/` 为展厅应用 |

Pages 构建已将资源基础路径设为 `/model-space/`，对应 `https://chenzhiyong1994.github.io/model-space/`。Fork 后如使用不同仓库名，应将 `package.json` 中 `build:pages` 的 `--base=/model-space/` 改为实际仓库路径；用户根站点或自定义域名根目录使用 `/`。同时更新 README、`package.json` 及 `site/index.html` 中的仓库和站点链接，避免指向上游项目。

本地执行 `npm run build:pages` 可检查部署产物；查看时需要把 `dist/` 挂载到与 `--base` 一致的 URL 前缀。日常根路径预览使用 `npm run build` 和 `npm run preview`。部署域名变化不会迁移浏览器存档，需要通过完整备份转移作品。

## 素材与许可

原创代码采用 [MIT License](LICENSE)。贡献时请保留已有版权与许可声明；提交模型、纹理或图片，需要说明来源、作者、许可及加工过程，并确认允许再分发。不要把私人备份、未获授权的素材或本地验证输出提交到仓库。

内置第三方素材清单见[素材来源](docs/asset-sources.md)。两个通用准备脚本 `scripts/prepare-decor-assets.py` 与 `scripts/prepare-exploration-assets.py` 用于重新获取公开素材和生成缩略图；应用正常开发和构建直接使用 `public/` 中已经打包的资源，不需要运行准备脚本。
