# MyPrompt — Cloudflare Pages 部署指南 (Deployment Guide)

本文档指导您将 **MyPrompt** 完整部署到 **Cloudflare Pages**，并配置 **Cloudflare KV**（提示词存储）、**Cloudflare R2**（图片/视频媒体存储）以及**加密登录认证**。

---

## 一、 部署前准备

1. 一个 **Cloudflare** 账号（免费版即可覆盖个人全部使用需求：KV 每日 10 万次读取，R2 免费 10GB 存储且零流量费）。
2. 一个 **GitHub** 仓库（将当前 `MyPrompt` 代码推送至您的 GitHub 私有或公开仓库）。
3. 一个 **Google Gemini API Key**（可在 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取；也可部署完成后直接在网页【API 设置】中输入）。

---

## 二、 在 Cloudflare 控制台创建存储资源并配置 `wrangler.toml`

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)：

### 1. 创建 KV 命名空间（存储提示词 Markdown 与目录树）
1. 左侧菜单进入 **Storage & Databases** → **KV**。
2. 点击 **Create a namespace**，名称填写 `myprompt-prompts-kv` → 点击 **Add**。
3. 复制该命名空间对应的 **32 位 Namespace ID**。

### 2. 创建 R2 存储桶（存储封面图、图片与视频）
1. 左侧菜单进入 **R2 Object Storage**（如首次使用按引导开通免费额度）。
2. 点击 **Create bucket**，名称填写 `myprompt-media` → 区域保持默认（Automatic）→ 点击 **Create bucket**。

### 3. 将绑定信息写入仓库根目录的 `wrangler.toml`
> **重要说明**：当仓库根目录存在 `wrangler.toml` 时，Cloudflare Pages 控制台中的 **Settings → Bindings** 会自动变灰锁定，转为**完全以 `wrangler.toml` 中的配置为准**（推荐该方式，配置随 Git 版本管理，重新部署永不丢失）。

打开 `wrangler.toml`，将 `id` 和 `bucket_name` 替换为您的实际资源值并推送至 GitHub：

```toml
name = "myprompt"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[[kv_namespaces]]
binding = "PROMPTS_KV"
id = "<替换为您的 32 位 KV Namespace ID>"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "<替换为您的 R2 Bucket 名称，例如 myprompt-media>"
```

*(若您更希望在 Cloudflare 网页控制台手动点选 Bindings，只需删除仓库中的 `wrangler.toml`，控制台的 Bindings 界面即可解除灰色锁定；届时需在控制台手动添加 `PROMPTS_KV`、`MEDIA_BUCKET` 及 `nodejs_compat` 兼容标志。)*

---

## 三、 连接 GitHub 并创建 Cloudflare Pages 项目

1. 左侧菜单进入 **Workers & Pages** → 点击 **Create**。
2. **注意区分入口**：新版 Cloudflare 控制台默认打开的是 **Workers** 入口（表单只有 `Build command` / `Deploy command`）。请找到页面底部的小字链接：
   > **"Looking to deploy Pages? Get started"**（中文界面为“想要部署 Pages？开始使用”）
3. 点击进入后，选择 **Import an existing Git repository** → 选择您的 GitHub 仓库 → **Begin setup**。
4. 填写构建配置：

| 配置项 | 填写内容 |
| :--- | :--- |
| **Project name** | `myprompt`（可自定义） |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npm run pages:build` |
| **Build output directory** | `.vercel/output/static` |

5. 展开 **Environment variables (advanced)**，添加以下环境变量：

| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `NPM_FLAGS` | `--legacy-peer-deps` | 必填，避免 `@cloudflare/next-on-pages` 与 `wrangler` 的 peer 依赖冲突 |
| `AUTH_SECRET` | 任意 32 位随机字符串 | 必填，用于签名 HttpOnly 登录 Cookie（生成命令见下方） |
| `GEMINI_API_KEY` | *(可选)* 您的 Gemini API Key | 服务端兜底 Key；不填也可以在网页【API 设置】中按浏览器单独配置 |

*(注：新版 Cloudflare Pages 默认运行环境已为 Node 20+，无需再手动设置 `NODE_VERSION`。)*

可在本地终端运行以下命令快速生成 32 位安全随机字符串作为 `AUTH_SECRET`：
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

6. 点击 **Save and Deploy** 开始构建部署。
   - 若看到 `Build queued / Waiting for other builds to complete`，属于免费版并发排队正常现象，等待约 1～2 分钟即可完成。
   - 部署成功后打开 `https://<project-name>.pages.dev`，登录后顶部左上角显示 **`Cloudflare Pages KV+R2`** 绿点即表示全部配置生效！

---

## 四、 登录账号与密码加密说明

应用已内置 Edge Middleware 全站登录保护：

- **加密机制**：密码采用 **Web Crypto API 加盐 SHA-256 哈希**校验，源码中绝不存放明文密码；登录成功后签发 7 天有效期的 **HMAC-SHA256 签名 `HttpOnly` Cookie**。
- **如需在云端修改登录用户名或密码**（无需改代码）：
  1. 在本机终端生成新密码的加盐 SHA-256 哈希：
     ```bash
     node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('myprompt-auth-salt-v1:你的新密码').digest('hex'))"
     ```
  2. 在 Cloudflare Pages → **Settings** → **Environment variables** 中添加：
     - `AUTH_USERNAME` = `你的新用户名`
     - `AUTH_PASSWORD_HASH` = `上一步生成的 64 位哈希值`
  3. 触发重新部署即可生效。

---

## 五、 使用命令行一键部署（可选）

如果您偏好直接从本机命令行发布到 Cloudflare Pages（无需经过 GitHub）：

```bash
# 1. 登录 Cloudflare CLI
npx wrangler login

# 2. 一键构建并部署到 Cloudflare Pages
npm run pages:deploy
```

---

## 六、 常见问题排查 (Troubleshooting)

1. **创建项目时没有看到 `Framework preset` 和 `Build output directory`，只看到 `Deploy command`**
   - 您进入了 **Workers** 入口而非 **Pages** 入口。请返回 **Workers & Pages → Create**，点击底部的 **"Looking to deploy Pages? Get started"** 进入 Pages 流程。
2. **控制台的 `Bindings` 按钮是灰色的无法点击**
   - 正常行为：因为仓库中存在 `wrangler.toml`，Cloudflare 自动切换为以配置文件为准。请直接修改 `wrangler.toml` 中的 `[[kv_namespaces]]` 与 `[[r2_buckets]]` 并推送 Git 即可自动绑定。
3. **构建报 `ERESOLVE unable to resolve dependency tree`**
   - 请确认在 Cloudflare Pages 环境变量中添加了 `NPM_FLAGS` = `--legacy-peer-deps`。
4. **上传超大视频进行 AI 反推时报错 413**
   - Cloudflare Pages 边缘函数单次内存有限，多模态反推单文件限制在 **20MB** 以内；大视频请先压缩分辨率或截取关键片段后再上传反推。
5. **绑定自定义域名**
   - 进入 Pages 项目的 **Custom domains** → **Set up a custom domain**，输入您的域名（例如 `prompt.yourdomain.com`），Cloudflare 将自动配置 DNS 与 HTTPS 证书。
