# MyPrompt — AI 提示词资产管理与多模态反向工作台

一个专为 AI 视觉与视频创作者打造的提示词管理、中英双向智能互译、自动打标签与 **Google Gemini 多模态反向推导**工作台。已全面适配 **Cloudflare Pages + KV + R2** 全球边缘网络部署，并内置**加密登录认证**。

---

## 核心功能

### 1. 左右三栏高效工作台
- **左侧导航与目录树**：支持多级文件夹管理（新建子目录、折叠展开、实时计数）、四大核心归类过滤（**文生图 / 图改图 / 图生视频 / 文生视频**）、适用模型筛选与全文实时模糊搜索。
- **中间提示词列表**：带封面缩略图、归类徽标、模型标签、更新时间与快速删除。
- **右侧双语编辑与参数工作台**：支持标准 Markdown (`.md`) + YAML Frontmatter 结构、常用参数可视化配置（`--ar`、`--stylize`、负向提示词、运镜）与 `Cmd+S` / `Ctrl+S` 快捷保存。

### 2. 中英双向智能互译 & AI 自动打标签
- **中英双向互译**：输入中文自动翻译为专业级英文 Prompt（保留 Octane render、volumetric light 等专业视觉术语）；输入英文自动翻译为通顺优美的中文释义。
- **AI 自动打标签**：点击标签卡片中的 **【AI 自动打标签】**，根据提示词描述自动提炼 3～6 个核心中文分类标签并去重合并。
- **AI 扩写润色**：一句话简短构思一键扩写为商业大片级完整提示词。
- **预设适用模型**：内置 `Minimax-H3`、`Qwen-Image`、`Google Omni`、`Nano Banana`、`Midjourney v6.1`、`FLUX.1-dev`、`Runway Gen-3`、`Kling AI`、`Sora` 等常用模型一键添加。

### 3. Google AI 多模态反向推导（独立高阶模型）
- 拖拽或上传照片（JPG / PNG / WEBP）或视频（MP4 / MOV / WEBM），调用 Google Gemini 深度反推画面主体、艺术风格、光影色彩、构图运镜与中英提示词，支持一键保存为新条目。
- **独立模型配置**：反推弹窗内置独立的【反推专用模型】下拉菜单与【刷新实时模型】按钮（默认推荐 `gemini-2.5-pro`），与全局 API 默认模型相互隔离、互不覆盖。

### 4. 加密登录认证
- 内置登录拦截中间件（Edge Middleware），未登录自动跳转至 `/login`，所有 `/api/*` 接口强制校验会话。
- 采用 **Web Crypto API 加盐 SHA-256 哈希校验**（代码中绝不存放明文密码）+ **HMAC-SHA256 签名 HttpOnly Cookie**（7 天有效）。

### 5. Cloudflare Pages 原生云端存储架构
- **提示词存储**：使用 **Cloudflare KV**（绑定名 `PROMPTS_KV`），以标准 Markdown + YAML Frontmatter 格式持久化存储，支持一键导出全站 JSON 备份。
- **图片与视频存储**：使用 **Cloudflare R2**（绑定名 `MEDIA_BUCKET`），支持封面图、原图与视频 HTTP Range 分片流式播放。

---

## 技术栈

- **框架**：Next.js 14 (App Router, Edge Runtime) + TypeScript + Tailwind CSS
- **图标**：Lucide React
- **AI 引擎**：Google Generative AI SDK (`@google/generative-ai`)
- **云端部署**：Cloudflare Pages (`@cloudflare/next-on-pages`) + Cloudflare KV + Cloudflare R2
- **安全认证**：Web Crypto API (`SHA-256` + `HMAC-SHA256` HttpOnly Session)

---

## 快速开始（本地开发）

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 启动本地开发服务器（固定端口 5059，同时监听 0.0.0.0 支持局域网访问）
npm run dev
```

打开浏览器访问：
- 本机：[http://localhost:5059](http://localhost:5059)
- 局域网：`http://<你的本机IP>:5059`

---

## 部署到 Cloudflare Pages

详细的云端部署、KV/R2 绑定与环境变量配置步骤，请参阅：
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
