# MyPrompt — Cloudflare Pages 部署指南 (Deployment Guide)

本文档指导您将 **MyPrompt** 完整部署到 **Cloudflare Pages**，并配置 **Cloudflare KV**（提示词存储）、**Cloudflare R2**（图片/视频媒体存储）以及**加密登录认证**。

---

## 一、 部署前准备

1. 一个 **Cloudflare** 账号（免费版即可覆盖个人全部使用需求：KV 每日 10 万次读取，R2 免费 10GB 存储且零流量费）。
2. 一个 **GitHub** 仓库（将当前 `MyPrompt` 代码推送至您的 GitHub 私有或公开仓库）。
3. 一个 **Google Gemini API Key**（可在 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取；也可部署完成后直接在网页【API 设置】中输入）。

---

## 二、 在 Cloudflare 控制台创建存储资源

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)：

### 1. 创建 KV 命名空间（存储提示词 Markdown 与目录树）
1. 左侧菜单进入 **Storage & Databases** → **KV**。
2. 点击 **Create a namespace**。
3. 名称填写：`myprompt-prompts-kv` → 点击 **Add**。

### 2. 创建 R2 存储桶（存储封面图、图片与视频）
1. 左侧菜单进入 **R2 Object Storage**（如首次使用按引导开通免费额度）。
2. 点击 **Create bucket**。
3. 存储桶名称填写：`myprompt-media` → 区域保持默认（Automatic）→ 点击 **Create bucket**。

---

## 三、 连接 GitHub 并创建 Cloudflare Pages 项目

1. 左侧菜单进入 **Workers & Pages** → 点击 **Create** → 选择 **Pages** 标签 → **Connect to Git**。
2. 选择您推送的 `MyPrompt` GitHub 仓库，点击 **Begin setup**。
3. 填写构建配置（**严格按以下参数填写**）：

| 配置项 | 填写内容 |
| :--- | :--- |
| **Project name** | `myprompt`（可自定义） |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npm run pages:build` |
| **Build output directory** | `.vercel/output/static` |

4. 展开 **Environment variables (advanced)**，添加以下环境变量：

| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20` | 推荐使用 Node 20 LTS 进行构建 |
| `NPM_FLAGS` | `--legacy-peer-deps` | 避免 `@cloudflare/next-on-pages` 与 `wrangler` 的 peer 依赖冲突 |
| `AUTH_SECRET` | 任意 32 位以上随机字符串 | 用于签名 HttpOnly 登录 Cookie（强烈建议设置专属随机密钥） |
| `GEMINI_API_KEY` | *(可选)* 您的 Gemini API Key | 服务端兜底 Key；不填也可以在网页【API 设置】中按浏览器单独配置 |

5. 点击 **Save and Deploy** 开始首次构建。

---

## 四、 绑定 KV、R2 与 Compatibility Flag（关键步骤）

首次构建完成后，进入该 Pages 项目的 **Settings** → **Functions**：

### 1. 开启 `nodejs_compat` 兼容标志
1. 找到 **Compatibility flags**。
2. 在 **Production** 和 **Preview** 中均添加：
   ```text
   nodejs_compat
   ```
3. 将 **Compatibility date** 设置为 `2024-09-23` 或更新日期。

### 2. 绑定 KV 命名空间
1. 在 **Settings** → **Bindings**（或 **Functions** → **KV namespace bindings**）点击 **Add** → 选择 **KV namespace**。
2. **Variable name**（变量名必须严格一致）：`PROMPTS_KV`
3. **KV namespace**：选择刚才创建的 `myprompt-prompts-kv` → 保存。

### 3. 绑定 R2 存储桶
1. 点击 **Add** → 选择 **R2 bucket**。
2. **Variable name**（变量名必须严格一致）：`MEDIA_BUCKET`
3. **R2 bucket**：选择刚才创建的 `myprompt-media` → 保存。

### 4. 重新触发一次部署使绑定生效
进入 **Deployments** → 点击最新一条部署右侧的 `...` → **Retry deployment**。等待部署完成即可！

---

## 五、 登录账号与密码加密说明

应用已内置 Edge Middleware 全站登录保护：

- **默认登录账号**：已在代码中内置加密校验（密码以 **加盐 SHA-256 哈希** 存储，源码中不含明文密码）。
- **如需在云端修改登录用户名或密码**（无需改代码）：
  1. 在本机终端执行以下命令生成新密码的加盐 SHA-256 哈希：
     ```bash
     node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('myprompt-auth-salt-v1:你的新密码').digest('hex'))"
     ```
  2. 在 Cloudflare Pages → **Settings** → **Environment variables** 中添加：
     - `AUTH_USERNAME` = `你的新用户名`
     - `AUTH_PASSWORD_HASH` = `上一步生成的 64 位哈希值`
  3. 重新部署即可生效。

---

## 六、 使用命令行一键部署（可选）

如果您偏好直接从本机命令行发布到 Cloudflare Pages（无需经过 GitHub）：

```bash
# 1. 登录 Cloudflare CLI
npx wrangler login

# 2. 一键构建并部署到 Cloudflare Pages
npm run pages:deploy
```

---

## 七、 常见问题排查 (Troubleshooting)

1. **构建报 `ERESOLVE unable to resolve dependency tree`**
   - 请确认在 Cloudflare Pages 环境变量中添加了 `NPM_FLAGS` = `--legacy-peer-deps`。
2. **部署后打开页面提示 500 或提示词无法持久化保存**
   - 请检查 **Settings → Bindings** 中变量名是否严格为 `PROMPTS_KV` 和 `MEDIA_BUCKET`，且修改绑定后是否重新触发了 **Retry deployment**。
3. **上传超大视频进行 AI 反推时报错 413**
   - Cloudflare Pages 边缘函数单次内存有限，多模态反推单文件限制在 **20MB** 以内；大视频请先压缩分辨率或截取关键片段后再上传反推。
4. **绑定自定义域名**
   - 进入 Pages 项目的 **Custom domains** → **Set up a custom domain**，输入您的域名（例如 `prompt.yourdomain.com`），Cloudflare 将自动配置 DNS 与 HTTPS 证书。
